/**
 * Realtime signal generation for immediate frontend display
 * Returns parsed signals immediately while storing asynchronously
 */

import { v } from "convex/values";
import { action } from "./_generated/server";

/**
 * Frontend-optimized signal generation
 * Returns signals immediately for display
 */
export const generateSignalsRealtime = action({
  args: {
    userId: v.string(),
    prompt: v.string(),
    anomalies: v.array(v.object({
      aoi_id: v.string(),
      aoi_name: v.string(),
      domain: v.union(
        v.literal("port"),
        v.literal("farm"),
        v.literal("mine"),
        v.literal("energy"),
        v.literal("unknown")
      ),
      magnitude: v.number(),
      confidence: v.number(),
      baseline: v.optional(v.number()),
      location: v.optional(v.object({
        lat: v.number(),
        lng: v.number(),
        region: v.optional(v.string()),
      })),
      description: v.optional(v.string()),
    })),
    market_context: v.optional(v.object({
      vix_level: v.optional(v.number()),
      dollar_index: v.optional(v.number()),
      commodity_trends: v.optional(v.array(v.string())),
      geopolitical_events: v.optional(v.array(v.string())),
    })),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    
    try {
      // Step 1: Create query record
      const queryResult = await ctx.runMutation("queries:logQueryStart", {
        userId: args.userId,
        prompt: args.prompt,
        params: {
          anomaly_count: args.anomalies.length,
          has_market_context: !!args.market_context,
          timestamp: new Date().toISOString(),
        },
      });

      if (!queryResult.allowed) {
        return {
          success: false,
          error: queryResult.reason || "Query not allowed",
          plan: queryResult.plan,
          signals: [],
        };
      }

      const queryId = queryResult.queryId;

      // Step 2: Generate signals with GPT-5
      // Map unknown domains to a default
      const processedAnomalies = args.anomalies.map(a => ({
        ...a,
        domain: a.domain === "unknown" ? "port" as const : a.domain as "port" | "farm" | "mine" | "energy",
        timestamp: new Date().toISOString(),
      }));

      const signalResult = await ctx.runAction("tradingSignals:generateTradingSignals", {
        queryId,
        anomalies: processedAnomalies,
        market_context: args.market_context,
        max_signals: 10, // Get more signals, frontend can filter
      });

      // Step 3: Return immediately with formatted response
      const response = {
        success: true,
        queryId,
        plan: queryResult.plan,
        signals: signalResult.signals.map(signal => ({
          // Core signal data
          instrument: signal.instrument,
          direction: signal.direction,
          thesis: signal.rationale,
          confidence: signal.confidence,
          
          // Additional context
          aoi: {
            id: signal.aoi_id,
            name: args.anomalies.find(a => a.aoi_id === signal.aoi_id)?.aoi_name || signal.aoi_id,
            domain: signal.domain,
            location: args.anomalies.find(a => a.aoi_id === signal.aoi_id)?.location,
          },
          magnitude: signal.magnitude,
          
          // Display helpers
          confidence_percent: Math.round(signal.confidence * 100),
          signal_strength: getSignalStrength(signal.confidence, signal.magnitude),
          priority: getSignalPriority(signal.confidence, signal.direction),
        })),
        summary: {
          ...signalResult.summary,
          processing_time_seconds: (Date.now() - startTime) / 1000,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          generated_at: signalResult.generated_at,
          status: signalResult.status,
          processing_time_ms: signalResult.processing_time_ms,
        },
      };

      console.log(`Generated ${response.signals.length} signals for user ${args.userId}`);
      return response;

    } catch (error) {
      console.error("Error in realtime signal generation:", error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Signal generation failed",
        signals: [],
        fallback: true,
      };
    }
  },
});

/**
 * Get signal strength classification
 */
function getSignalStrength(confidence: number, magnitude: number): "strong" | "moderate" | "weak" {
  const combined = confidence * magnitude;
  if (combined > 0.6) return "strong";
  if (combined > 0.3) return "moderate";
  return "weak";
}

/**
 * Get signal priority for sorting
 */
function getSignalPriority(confidence: number, direction: string): number {
  // Prioritize high confidence non-neutral signals
  if (direction === "neutral") {
    return confidence * 0.5;
  }
  return confidence;
}

/**
 * Simplified quick check for existing signals
 */
export const checkExistingSignals = action({
  args: {
    userId: v.string(),
    aoi_ids: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Get recent queries for user
    const recentQueries = await ctx.runQuery("queries:getUserQueries", {
      userId: args.userId,
      limit: 5,
    });

    if (recentQueries.length === 0) {
      return { has_existing: false };
    }

    // Check if any recent query has signals for these AOIs
    for (const query of recentQueries) {
      const signals = await ctx.runMutation("tradingSignals:getSignalsForQuery", {
        queryId: query._id,
      });

      const hasMatchingAOI = signals.some(signal => 
        args.aoi_ids.includes(signal.aoi?.id)
      );

      if (hasMatchingAOI) {
        return {
          has_existing: true,
          query_id: query._id,
          created_at: query.createdAt,
          signals: signals.filter(s => args.aoi_ids.includes(s.aoi?.id)),
        };
      }
    }

    return { has_existing: false };
  },
});
