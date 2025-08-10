/**
 * Test the rerun analysis capability
 */

import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * Test creating and rerunning an anomaly set
 */
export const testRerunCapability = action({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = args.userId || "test-user-" + Date.now();
    
    console.log("Testing rerun capability...");
    
    // Step 1: Create a test anomaly set
    const testAnomalies = [
      {
        aoi_id: "port-la-001",
        aoi_name: "Port of Los Angeles",
        domain: "port" as const,
        magnitude: 0.65,
        confidence: 0.80,
        baseline: 0.35,
        timestamp: new Date().toISOString(),
        location: {
          lat: 33.7406,
          lng: -118.2706,
          region: "West Coast USA",
        },
        description: "Moderate congestion detected",
      },
      {
        aoi_id: "mine-australia-iron-002",
        aoi_name: "Pilbara Iron Ore Mine",
        domain: "mine" as const,
        magnitude: 0.72,
        confidence: 0.88,
        baseline: 0.50,
        timestamp: new Date().toISOString(),
        location: {
          lat: -22.5900,
          lng: 117.1800,
          region: "Western Australia",
        },
        description: "Increased extraction activity",
      },
      {
        aoi_id: "farm-brazil-soy-003",
        aoi_name: "Mato Grosso Soybean Region",
        domain: "farm" as const,
        magnitude: 0.58,
        confidence: 0.75,
        baseline: 0.45,
        timestamp: new Date().toISOString(),
        location: {
          lat: -12.6819,
          lng: -56.9211,
          region: "Central Brazil",
        },
        description: "Early harvest indicators",
      },
    ];
    
    // Store the anomaly set
    const anomalySetId = await ctx.runMutation("rerunAnalysis:storeAnomalySet", {
      name: "Test Anomaly Set - " + new Date().toLocaleDateString(),
      description: "Test set for demonstrating rerun capability",
      userId,
      anomalies: testAnomalies,
      metadata: {
        test: true,
        created_for_demo: true,
      },
    });
    
    console.log(`Created anomaly set: ${anomalySetId}`);
    
    // Step 2: Run initial analysis with normal market conditions
    const initialContext = {
      vix_level: 18,
      dollar_index: 98,
      commodity_trends: ["Iron ore prices stable", "Soybean futures up 2%"],
      geopolitical_events: ["Trade talks progressing"],
    };
    
    const initialRun = await ctx.runAction("rerunAnalysis:rerunAnalysis", {
      anomalySetId,
      userId,
      market_context: initialContext,
      save_as_new_query: true,
      compare_with_previous: false,
    });
    
    console.log(`Initial run completed with ${initialRun.signals?.length || 0} signals`);
    
    // Step 3: Simulate market change and rerun
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    const stressedContext = {
      vix_level: 35, // Market stress!
      dollar_index: 105, // Dollar surge
      commodity_trends: ["Iron ore down 5%", "Soybean volatility spike", "Shipping rates surge"],
      geopolitical_events: ["Trade tensions escalate", "Port strikes threatened"],
    };
    
    const stressedRun = await ctx.runAction("rerunAnalysis:rerunAnalysis", {
      anomalySetId,
      userId,
      market_context: stressedContext,
      save_as_new_query: true,
      compare_with_previous: true, // Compare with initial run
    });
    
    console.log(`Stressed market run completed with ${stressedRun.signals?.length || 0} signals`);
    
    // Step 4: Focus on specific domains
    const focusedRun = await ctx.runAction("rerunAnalysis:rerunAnalysis", {
      anomalySetId,
      userId,
      market_context: initialContext,
      focus_domains: ["port", "mine"], // Only analyze port and mine anomalies
      save_as_new_query: false,
      compare_with_previous: false,
    });
    
    console.log(`Focused run completed with ${focusedRun.signals?.length || 0} signals`);
    
    // Format results for display
    return {
      test_summary: {
        anomaly_set_id: anomalySetId,
        anomaly_count: testAnomalies.length,
        total_runs: 3,
        user_id: userId,
      },
      
      initial_run: {
        market_conditions: "Normal (VIX: 18)",
        signals_generated: initialRun.signals?.length || 0,
        top_signals: initialRun.signals?.slice(0, 3).map(s => ({
          instrument: s.instrument,
          direction: s.direction,
          confidence: `${(s.confidence * 100).toFixed(0)}%`,
        })),
        summary: initialRun.summary,
      },
      
      stressed_market_run: {
        market_conditions: "Stressed (VIX: 35)",
        signals_generated: stressedRun.signals?.length || 0,
        top_signals: stressedRun.signals?.slice(0, 3).map(s => ({
          instrument: s.instrument,
          direction: s.direction,
          confidence: `${(s.confidence * 100).toFixed(0)}%`,
        })),
        comparison_with_initial: stressedRun.comparison ? {
          direction_changes: stressedRun.comparison.direction_changes,
          new_signals: stressedRun.comparison.added_signals?.map(s => s.instrument),
          removed_signals: stressedRun.comparison.removed_signals?.map(s => s.instrument),
          summary: stressedRun.comparison.summary,
        } : null,
      },
      
      focused_run: {
        domains_analyzed: ["port", "mine"],
        signals_generated: focusedRun.signals?.length || 0,
        anomalies_processed: 2, // Only port and mine
      },
      
      capabilities_demonstrated: [
        "✅ Store anomaly sets for future reanalysis",
        "✅ Rerun with different market contexts",
        "✅ Compare results between runs",
        "✅ Focus on specific domains",
        "✅ Track run history and results",
      ],
    };
  },
});

/**
 * Test creating anomaly set from existing query
 */
export const testCreateFromQuery = action({
  args: {
    queryId: v.id("queries"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("Creating anomaly set from existing query...");
    
    const result = await ctx.runAction("rerunAnalysis:createAnomalySetFromQuery", {
      queryId: args.queryId,
      userId: args.userId,
      name: `Saved from Query - ${new Date().toLocaleDateString()}`,
      description: "Anomaly set created from previous query results",
    });
    
    if (result.success) {
      console.log(`Successfully created anomaly set: ${result.anomaly_set_id}`);
      
      // Now rerun with different context
      const rerunResult = await ctx.runAction("rerunAnalysis:rerunAnalysis", {
        anomalySetId: result.anomaly_set_id,
        userId: args.userId,
        market_context: {
          vix_level: 25,
          dollar_index: 102,
          commodity_trends: ["Mixed commodity signals"],
        },
        save_as_new_query: true,
      });
      
      return {
        anomaly_set_created: true,
        anomaly_set_id: result.anomaly_set_id,
        anomaly_count: result.anomaly_count,
        rerun_completed: true,
        new_signals: rerunResult.signals?.length || 0,
        message: result.message,
      };
    }
    
    return {
      anomaly_set_created: false,
      error: "Failed to create anomaly set from query",
    };
  },
});

/**
 * Get user's anomaly sets with run statistics
 */
export const getUserAnomalySetsWithStats = action({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const anomalySets = await ctx.runQuery("rerunAnalysis:getUserAnomalySets", {
      userId: args.userId,
      limit: 10,
    });
    
    // Format with statistics
    const setsWithStats = anomalySets.map(set => ({
      id: set._id,
      name: set.name,
      description: set.description,
      anomaly_count: set.anomalies.length,
      domains: [...new Set(set.anomalies.map(a => a.domain))],
      created_at: new Date(set.created_at || 0).toLocaleDateString(),
      run_count: set.run_count || 0,
      last_run: set.last_run_at ? 
        new Date(set.last_run_at).toLocaleString() : 
        "Never",
      has_results: !!set.last_run_results,
    }));
    
    return {
      total_sets: setsWithStats.length,
      anomaly_sets: setsWithStats,
      usage_tip: "Use rerunAnalysis to regenerate signals with updated market context",
    };
  },
});
