/**
 * Test the simplified trading signals generation
 */

import { action } from "./_generated/server";
import { v } from "convex/values";

export const testTradingSignals = action({
  args: {
    queryId: v.optional(v.id("queries")), // Optional queryId to store signals
  },
  handler: async (ctx, args) => {
    // Sample anomalies from different sectors
    const testAnomalies = [
      {
        aoi_id: "singapore-port-west",
        aoi_name: "Singapore Port - Tuas Terminal",
        domain: "port" as const,
        magnitude: 0.78,
        confidence: 0.88,
        baseline: 0.35,
        timestamp: new Date().toISOString(),
        location: {
          lat: 1.2983,
          lng: 103.6400,
          region: "Southeast Asia",
        },
        description: "Significant vessel congestion detected, 40+ ships waiting",
      },
      {
        aoi_id: "copper-mine-chile",
        aoi_name: "Chuquicamata Copper Mine",
        domain: "mine" as const,
        magnitude: 0.65,
        confidence: 0.92,
        baseline: 0.48,
        timestamp: new Date().toISOString(),
        location: {
          lat: -22.3100,
          lng: -68.9000,
          region: "Northern Chile",
        },
        description: "Increased extraction activity and stockpile buildup observed",
      },
      {
        aoi_id: "midwest-corn-belt",
        aoi_name: "Iowa Corn Production Zone",
        domain: "farm" as const,
        magnitude: 0.52,
        confidence: 0.75,
        baseline: 0.40,
        timestamp: new Date().toISOString(),
        location: {
          lat: 41.8780,
          lng: -93.0977,
          region: "Midwest USA",
        },
        description: "Drought stress indicators across 30% of cropland",
      },
      {
        aoi_id: "houston-refinery",
        aoi_name: "Houston Refinery Complex",
        domain: "energy" as const,
        magnitude: 0.71,
        confidence: 0.83,
        baseline: 0.55,
        timestamp: new Date().toISOString(),
        location: {
          lat: 29.7749,
          lng: -95.3141,
          region: "Gulf Coast USA",
        },
        description: "Reduced flaring activity indicating operational issues",
      },
    ];

    // Market context
    const marketContext = {
      vix_level: 22.5,
      dollar_index: 104.2,
      commodity_trends: [
        "Copper near 2-year highs",
        "Agricultural futures rallying",
        "Oil volatility elevated",
      ],
      geopolitical_events: [
        "China reopening boosting commodity demand",
        "Fed rate decision next week",
      ],
    };

    console.log("Generating trading signals from anomalies...");
    
    // Create a test query if no queryId provided
    let queryId = args.queryId;
    if (!queryId) {
      // Create a test query for storing signals
      const queryResult = await ctx.runMutation("queries:logQueryStart", {
        userId: "test-user-" + Date.now(),
        prompt: "Test trading signal generation",
        params: {
          test: true,
          anomaly_count: testAnomalies.length,
        },
      });
      
      if (queryResult.allowed) {
        queryId = queryResult.queryId;
        console.log(`Created test query: ${queryId}`);
      }
    }

    // Generate trading signals
    const result = await ctx.runAction("tradingSignals:generateTradingSignals", {
      queryId: queryId, // Pass queryId to store signals in database
      anomalies: testAnomalies,
      market_context: marketContext,
      max_signals: 5,
    });

    // Format for display
    const formattedOutput = {
      query_id: queryId,
      signals_stored: result.stored_signal_ids?.length || 0,
      timestamp: new Date().toISOString(),
      processing_time: `${(result.processing_time_ms / 1000).toFixed(2)}s`,
      market_context: {
        vix: `${marketContext.vix_level} (Elevated)`,
        dollar: marketContext.dollar_index,
        trends: marketContext.commodity_trends,
      },
      trading_signals: result.signals.map(signal => ({
        "🎯 Instrument": signal.instrument,
        "📊 Direction": signal.direction.toUpperCase(),
        "💡 Thesis": signal.rationale,
        "📈 Confidence": `${(signal.confidence * 100).toFixed(0)}%`,
        "🌍 Source": `${signal.domain} - ${signal.aoi_id}`,
      })),
      summary: {
        ...result.summary,
        recommendation: getTradeRecommendation(result.summary),
      },
      execution_notes: generateExecutionNotes(result.signals),
    };

    return formattedOutput;
  },
});

/**
 * Test quick signal generation for a single anomaly
 */
export const testQuickSignal = action({
  args: {},
  handler: async (ctx) => {
    console.log("Testing quick signal generation...");

    const signal = await ctx.runAction("tradingSignals:quickSignal", {
      aoi_id: "test-port-anomaly",
      domain: "port",
      magnitude: 0.82,
      confidence: 0.90,
      description: "Major congestion at key shipping terminal",
    });

    return {
      generated_signal: {
        instrument: signal.instrument,
        direction: signal.direction,
        confidence: `${(signal.confidence * 100).toFixed(0)}%`,
        thesis: signal.rationale,
      },
      trading_action: `${signal.direction.toUpperCase()} ${signal.instrument}`,
      position_sizing: getPositionSizing(signal.confidence),
      risk_management: getRiskManagement(signal.direction, signal.confidence),
    };
  },
});

/**
 * Generate trade recommendation based on summary
 */
function getTradeRecommendation(summary: any): string {
  const { directional_bias, average_confidence, signal_quality } = summary;
  
  if (signal_quality !== 'actionable') {
    return "⚠️ Review recommended - Signals require manual verification";
  }
  
  if (directional_bias.net_direction === 'bullish' && average_confidence > 0.7) {
    return "✅ Strong BUY signal - Overweight risk assets";
  } else if (directional_bias.net_direction === 'bearish' && average_confidence > 0.7) {
    return "🔴 Strong SELL signal - Reduce risk exposure";
  } else if (directional_bias.net_direction === 'balanced') {
    return "⚖️ Market neutral - Consider pairs trading";
  } else {
    return "📊 Moderate signal - Scale positions accordingly";
  }
}

/**
 * Generate execution notes for signals
 */
function generateExecutionNotes(signals: any[]): string[] {
  const notes: string[] = [];
  
  // Check for correlated positions
  const instruments = signals.map(s => s.instrument);
  const hasCorrelatedPositions = instruments.some(inst => 
    instruments.filter(i => i === inst).length > 1
  );
  
  if (hasCorrelatedPositions) {
    notes.push("⚠️ Correlated positions detected - consider position sizing");
  }
  
  // Check confidence spread
  const confidences = signals.map(s => s.confidence);
  const maxConf = Math.max(...confidences);
  const minConf = Math.min(...confidences);
  
  if (maxConf - minConf > 0.3) {
    notes.push("📊 Wide confidence spread - prioritize high-confidence trades");
  }
  
  // Check for hedging opportunities
  const hasLongs = signals.some(s => s.direction === 'long');
  const hasShorts = signals.some(s => s.direction === 'short');
  
  if (hasLongs && hasShorts) {
    notes.push("🔄 Natural hedge present - consider as portfolio trade");
  }
  
  // Timing note
  const now = new Date();
  const hour = now.getUTCHours();
  
  if (hour >= 13 && hour <= 20) {
    notes.push("🕐 US market hours - Good liquidity for execution");
  } else if (hour >= 1 && hour <= 8) {
    notes.push("🌏 Asian market hours - Check liquidity before trading");
  } else {
    notes.push("🌍 European market hours - Monitor FX impact");
  }
  
  return notes;
}

/**
 * Get position sizing recommendation
 */
function getPositionSizing(confidence: number): string {
  if (confidence >= 0.8) {
    return "Full position (100% of allocation)";
  } else if (confidence >= 0.6) {
    return "3/4 position (75% of allocation)";
  } else if (confidence >= 0.4) {
    return "Half position (50% of allocation)";
  } else {
    return "Starter position (25% of allocation)";
  }
}

/**
 * Get risk management guidelines
 */
function getRiskManagement(direction: string, confidence: number): string {
  const stopLoss = confidence >= 0.7 ? 3 : confidence >= 0.5 ? 2 : 1.5;
  const target = stopLoss * (confidence >= 0.7 ? 3 : 2);
  
  if (direction === 'long') {
    return `Stop: -${stopLoss}% | Target: +${target}% | Risk/Reward: 1:${(target/stopLoss).toFixed(1)}`;
  } else if (direction === 'short') {
    return `Stop: +${stopLoss}% | Target: -${target}% | Risk/Reward: 1:${(target/stopLoss).toFixed(1)}`;
  } else {
    return "Monitor only - No position recommended";
  }
}
