/**
 * Rerun GPT-5 analysis on stored anomaly sets
 * Allows regenerating signals with updated context or parameters
 */

import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Store anomaly set for future rerun capability
 */
export const storeAnomalySet = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    userId: v.string(),
    anomalies: v.array(v.object({
      aoi_id: v.string(),
      aoi_name: v.string(),
      domain: v.union(
        v.literal("port"),
        v.literal("farm"),
        v.literal("mine"),
        v.literal("energy")
      ),
      magnitude: v.number(),
      confidence: v.number(),
      baseline: v.optional(v.number()),
      timestamp: v.string(),
      location: v.optional(v.object({
        lat: v.number(),
        lng: v.number(),
        region: v.optional(v.string()),
      })),
      description: v.optional(v.string()),
    })),
    original_query_id: v.optional(v.id("queries")),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const anomalySetId = await ctx.db.insert("anomaly_sets", {
      name: args.name,
      description: args.description,
      userId: args.userId,
      anomalies: args.anomalies,
      original_query_id: args.original_query_id,
      metadata: args.metadata,
      created_at: Date.now(),
      run_count: 0,
      last_run_at: null,
    });
    
    console.log(`Stored anomaly set ${anomalySetId} with ${args.anomalies.length} anomalies`);
    return anomalySetId;
  },
});

/**
 * Get stored anomaly sets for a user
 */
export const getUserAnomalySets = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const sets = await ctx.db
      .query("anomaly_sets")
      .withIndex("by_userId", q => q.eq("userId", args.userId))
      .collect();
    
    // Sort by created_at descending
    sets.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    
    const limit = args.limit || 20;
    return sets.slice(0, limit);
  },
});

/**
 * Get a specific anomaly set
 */
export const getAnomalySet = query({
  args: {
    anomalySetId: v.id("anomaly_sets"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.anomalySetId);
  },
});

/**
 * Rerun GPT-5 analysis on a stored anomaly set
 */
export const rerunAnalysis = action({
  args: {
    anomalySetId: v.id("anomaly_sets"),
    userId: v.string(),
    
    // Optional overrides
    market_context: v.optional(v.object({
      vix_level: v.optional(v.number()),
      dollar_index: v.optional(v.number()),
      commodity_trends: v.optional(v.array(v.string())),
      geopolitical_events: v.optional(v.array(v.string())),
    })),
    
    // Analysis parameters
    max_signals: v.optional(v.number()),
    temperature: v.optional(v.number()), // Override GPT temperature
    focus_domains: v.optional(v.array(v.string())), // Focus on specific domains
    
    // Rerun options
    save_as_new_query: v.optional(v.boolean()),
    compare_with_previous: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    
    try {
      // Fetch the anomaly set
      const anomalySet = await ctx.runQuery("rerunAnalysis:getAnomalySet", {
        anomalySetId: args.anomalySetId,
      });
      
      if (!anomalySet) {
        throw new Error("Anomaly set not found");
      }
      
      if (anomalySet.userId !== args.userId) {
        throw new Error("Unauthorized: You don't own this anomaly set");
      }
      
      // Filter anomalies if focusing on specific domains
      let anomalies = anomalySet.anomalies;
      if (args.focus_domains && args.focus_domains.length > 0) {
        anomalies = anomalies.filter(a => 
          args.focus_domains!.includes(a.domain)
        );
      }
      
      // Create a new query if requested
      let queryId: Id<"queries"> | undefined;
      if (args.save_as_new_query) {
        const queryResult = await ctx.runMutation("queries:logQueryStart", {
          userId: args.userId,
          prompt: `Rerun analysis on: ${anomalySet.name}`,
          params: {
            anomaly_set_id: args.anomalySetId,
            rerun: true,
            run_number: (anomalySet.run_count || 0) + 1,
            timestamp: new Date().toISOString(),
          },
        });
        
        if (!queryResult.allowed) {
          return {
            success: false,
            error: queryResult.reason || "Query not allowed",
            plan: queryResult.plan,
          };
        }
        
        queryId = queryResult.queryId;
      }
      
      // Get previous run results if comparison requested
      let previousSignals = null;
      if (args.compare_with_previous && anomalySet.last_run_results) {
        previousSignals = anomalySet.last_run_results;
      }
      
      // Generate new signals with potentially updated context
      const signalResult = await ctx.runAction("tradingSignals:generateTradingSignals", {
        queryId,
        anomalies,
        market_context: args.market_context || generateDefaultMarketContext(),
        max_signals: args.max_signals || 10,
      });
      
      // Update the anomaly set with run information
      await ctx.runMutation("rerunAnalysis:updateAnomalySetRunInfo", {
        anomalySetId: args.anomalySetId,
        run_count: (anomalySet.run_count || 0) + 1,
        last_run_at: Date.now(),
        last_run_results: signalResult.signals,
      });
      
      // Prepare comparison if requested
      let comparison = null;
      if (previousSignals && args.compare_with_previous) {
        comparison = compareSignals(previousSignals, signalResult.signals);
      }
      
      // Return results
      return {
        success: true,
        anomaly_set: {
          id: args.anomalySetId,
          name: anomalySet.name,
          anomaly_count: anomalies.length,
          run_count: (anomalySet.run_count || 0) + 1,
        },
        signals: signalResult.signals,
        summary: signalResult.summary,
        comparison,
        metadata: {
          processing_time_ms: Date.now() - startTime,
          generated_at: new Date().toISOString(),
          market_context_used: args.market_context || "default",
          query_id: queryId,
        },
      };
      
    } catch (error) {
      console.error("Error in rerun analysis:", error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Rerun failed",
      };
    }
  },
});

/**
 * Update anomaly set run information
 */
export const updateAnomalySetRunInfo = mutation({
  args: {
    anomalySetId: v.id("anomaly_sets"),
    run_count: v.number(),
    last_run_at: v.number(),
    last_run_results: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.anomalySetId, {
      run_count: args.run_count,
      last_run_at: args.last_run_at,
      last_run_results: args.last_run_results,
    });
  },
});

/**
 * Create anomaly set from existing query
 */
export const createAnomalySetFromQuery = action({
  args: {
    queryId: v.id("queries"),
    userId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get signals from the query
    const signals = await ctx.runMutation("tradingSignals:getSignalsForQuery", {
      queryId: args.queryId,
    });
    
    if (signals.length === 0) {
      throw new Error("No signals found for this query");
    }
    
    // Extract unique anomalies from signals
    const anomalyMap = new Map();
    signals.forEach(signal => {
      if (signal.aoi && !anomalyMap.has(signal.aoi.id)) {
        anomalyMap.set(signal.aoi.id, {
          aoi_id: signal.aoi.id,
          aoi_name: signal.aoi.id, // Use ID as name if not available
          domain: signal.aoi.domain || "port",
          magnitude: signal.magnitude,
          confidence: signal.confidence,
          timestamp: new Date().toISOString(),
        });
      }
    });
    
    const anomalies = Array.from(anomalyMap.values());
    
    // Store as anomaly set
    const anomalySetId = await ctx.runMutation("rerunAnalysis:storeAnomalySet", {
      name: args.name,
      description: args.description,
      userId: args.userId,
      anomalies,
      original_query_id: args.queryId,
      metadata: {
        created_from_query: true,
        signal_count: signals.length,
      },
    });
    
    return {
      success: true,
      anomaly_set_id: anomalySetId,
      anomaly_count: anomalies.length,
      message: `Created anomaly set "${args.name}" with ${anomalies.length} anomalies`,
    };
  },
});

/**
 * Compare two sets of signals
 */
function compareSignals(previous: any[], current: any[]) {
  const prevInstruments = new Set(previous.map(s => s.instrument));
  const currInstruments = new Set(current.map(s => s.instrument));
  
  // Find changes
  const added = current.filter(s => !prevInstruments.has(s.instrument));
  const removed = previous.filter(s => !currInstruments.has(s.instrument));
  
  // Find direction changes
  const directionChanges = [];
  current.forEach(currSignal => {
    const prevSignal = previous.find(p => p.instrument === currSignal.instrument);
    if (prevSignal && prevSignal.direction !== currSignal.direction) {
      directionChanges.push({
        instrument: currSignal.instrument,
        previous_direction: prevSignal.direction,
        current_direction: currSignal.direction,
        confidence_change: currSignal.confidence - prevSignal.confidence,
      });
    }
  });
  
  // Calculate confidence changes
  const confidenceChanges = [];
  current.forEach(currSignal => {
    const prevSignal = previous.find(p => p.instrument === currSignal.instrument);
    if (prevSignal) {
      const change = currSignal.confidence - prevSignal.confidence;
      if (Math.abs(change) > 0.1) { // Significant change
        confidenceChanges.push({
          instrument: currSignal.instrument,
          previous: prevSignal.confidence,
          current: currSignal.confidence,
          change: change,
          change_percent: (change / prevSignal.confidence) * 100,
        });
      }
    }
  });
  
  return {
    summary: {
      previous_count: previous.length,
      current_count: current.length,
      added_count: added.length,
      removed_count: removed.length,
      direction_changes_count: directionChanges.length,
      confidence_changes_count: confidenceChanges.length,
    },
    added_signals: added.slice(0, 5), // Top 5 new signals
    removed_signals: removed.slice(0, 5),
    direction_changes: directionChanges,
    confidence_changes: confidenceChanges.sort((a, b) => 
      Math.abs(b.change) - Math.abs(a.change)
    ).slice(0, 5), // Top 5 confidence changes
  };
}

/**
 * Generate default market context based on current conditions
 */
function generateDefaultMarketContext() {
  // This could be enhanced to fetch real market data
  return {
    vix_level: 20, // Default normal volatility
    dollar_index: 100,
    commodity_trends: ["Stable commodity prices"],
    geopolitical_events: ["No major events"],
  };
}

/**
 * Delete an anomaly set
 */
export const deleteAnomalySet = mutation({
  args: {
    anomalySetId: v.id("anomaly_sets"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const anomalySet = await ctx.db.get(args.anomalySetId);
    
    if (!anomalySet) {
      throw new Error("Anomaly set not found");
    }
    
    if (anomalySet.userId !== args.userId) {
      throw new Error("Unauthorized: You don't own this anomaly set");
    }
    
    await ctx.db.delete(args.anomalySetId);
    
    return {
      success: true,
      message: `Deleted anomaly set "${anomalySet.name}"`,
    };
  },
});
