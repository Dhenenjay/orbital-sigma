/**
 * Test function to demonstrate signal generation from anomalies
 */

/**
 * Test Trading Signal Generation with Sample Anomalies
 * Verifies GPT outputs plausible, market-relevant signals
 */

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
/**
 * Test the signal generation with sample anomaly data
 */
export const testSignalGeneration = action({
  args: {
    queryId: v.optional(v.id("queries")),
  },
  handler: async (ctx, args) => {
    // Sample anomaly data for testing
    const testAnomalies = [
      {
        aoi_id: "port-singapore-001",
        aoi_name: "Port of Singapore",
        domain: "port" as const,
        magnitude: 0.73,
        confidence: 0.85,
        baseline: 0.32,
        timestamp: new Date().toISOString(),
        location: {
          lat: 1.2655,
          lng: 103.8186,
          region: "Southeast Asia",
        },
        embeddings: {
          current: Array(64).fill(0).map(() => Math.random() * 0.5),
          baseline: Array(64).fill(0).map(() => Math.random() * 0.3),
          weighted_magnitude: 0.68,
        },
        instrument_quality: 0.92,
      },
      {
        aoi_id: "farm-iowa-042",
        aoi_name: "Iowa Corn Belt Region",
        domain: "farm" as const,
        magnitude: 0.45,
        confidence: 0.72,
        baseline: 0.38,
        timestamp: new Date().toISOString(),
        location: {
          lat: 42.0003,
          lng: -93.2140,
          region: "Midwest USA",
        },
        instrument_quality: 0.88,
      },
      {
        aoi_id: "mine-chile-copper-003",
        aoi_name: "Escondida Copper Mine",
        domain: "mine" as const,
        magnitude: 0.81,
        confidence: 0.91,
        baseline: 0.45,
        timestamp: new Date().toISOString(),
        location: {
          lat: -24.2500,
          lng: -69.0667,
          region: "Northern Chile",
        },
        embeddings: {
          current: Array(64).fill(0).map(() => Math.random() * 0.6),
          baseline: Array(64).fill(0).map(() => Math.random() * 0.4),
          weighted_magnitude: 0.77,
        },
        instrument_quality: 0.95,
      },
      {
        aoi_id: "energy-gulf-refinery-007",
        aoi_name: "Gulf Coast Refinery Complex",
        domain: "energy" as const,
        magnitude: 0.62,
        confidence: 0.78,
        baseline: 0.51,
        timestamp: new Date().toISOString(),
        location: {
          lat: 29.7604,
          lng: -95.3698,
          region: "Gulf Coast USA",
        },
        instrument_quality: 0.90,
      },
    ];

    // Market context for analysis
    const testContext = {
      market_conditions: [
        "Supply chain tensions in Asia-Pacific region",
        "Rising commodity prices globally",
        "Tightening monetary policy in major economies",
      ],
      recent_events: [
        "Major typhoon passed through Southeast Asia last week",
        "Copper prices at 2-year highs",
        "Energy sector volatility due to geopolitical tensions",
      ],
      seasonal_factors: [
        "Northern hemisphere harvest season",
        "Peak shipping season for holiday goods",
        "Winter energy demand buildup",
      ],
    };

    // If no queryId provided, create a test query
    let queryId = args.queryId;
    if (!queryId) {
      const testQueryResult = await ctx.runMutation("queries:logQueryStart", {
        userId: "test-user-" + Date.now(),
        prompt: "Test signal generation from anomalies",
        params: {
          test: true,
          anomaly_count: testAnomalies.length,
        },
      });
      
      if (testQueryResult.allowed) {
        queryId = testQueryResult.queryId;
      } else {
        throw new Error("Could not create test query: " + testQueryResult.reason);
      }
    }

    // Generate signals using GPT-5 analysis
    const result = await ctx.runAction("generateSignals:generateSignalsFromAnomalies", {
      queryId,
      anomalies: testAnomalies,
      context: testContext,
    });

    // Format the results for display
    const formattedResults = {
      query_id: queryId,
      processing_time_seconds: (result.processingTimeMs / 1000).toFixed(2),
      signals_generated: result.signalsGenerated,
      analyses_completed: result.analysesCompleted,
      summary: result.summary,
      signals: result.signals.map(signal => ({
        aoi: signal.aoi.name,
        domain: signal.aoi.domain,
        direction: signal.direction,
        confidence: (signal.confidence * 100).toFixed(1) + "%",
        magnitude: signal.magnitude.toFixed(4),
        severity: signal.severity,
        economic_impact: signal.economic_impact,
        recommendation: signal.top_recommendation,
        thesis_preview: signal.thesis.substring(0, 200) + "...",
      })),
      market_outlook: result.summary.market_outlook,
      investment_opportunities: result.signals
        .filter(s => s.direction !== "neutral")
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3)
        .map(s => ({
          opportunity: `${s.direction.toUpperCase()} ${s.aoi.domain} sector via ${s.aoi.name}`,
          confidence: (s.confidence * 100).toFixed(1) + "%",
          rationale: s.thesis.substring(0, 150) + "...",
        })),
    };

    console.log("Signal generation test completed successfully");
    return formattedResults;
  },
});

/**
 * Get recent market analyses for display
 */
export const getRecentAnalyses = action({
  args: {
    limit: v.optional(v.number()),
    domain: v.optional(v.union(
      v.literal("port"),
      v.literal("farm"),
      v.literal("mine"),
      v.literal("energy")
    )),
  },
  handler: async (ctx, args) => {
    // This would query stored analyses from the database
    // For now, return a placeholder
    return {
      message: "Analysis retrieval functionality to be implemented",
      requested_limit: args.limit || 10,
      requested_domain: args.domain || "all",
    };
  },
});
