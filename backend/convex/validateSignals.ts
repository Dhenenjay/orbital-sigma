/**
 * Validate Trading Signal Generation with Market-Relevant Scenarios
 * Tests GPT outputs for plausibility and market relevance
 */

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// Real-world anomaly scenarios
const SCENARIOS = {
  // Scenario 1: Supply Chain Crisis
  supplyChainCrisis: {
    name: "Global Supply Chain Disruption",
    description: "Major port congestion combined with shipping bottlenecks",
    anomalies: [
      {
        aoi_id: "port_shanghai",
        aoi_name: "Shanghai Port",
        domain: "port" as const,
        magnitude: 0.89,
        confidence: 0.94,
        baseline: 0.25,
        timestamp: new Date().toISOString(),
        location: { lat: 31.2304, lng: 121.4737, region: "East China" },
        description: "Vessel queue 200% above normal. 150+ ships waiting. Container yard at 98% capacity.",
      },
      {
        aoi_id: "port_la_longbeach",
        aoi_name: "LA/Long Beach Port Complex",
        domain: "port" as const,
        magnitude: 0.76,
        confidence: 0.88,
        baseline: 0.32,
        timestamp: new Date().toISOString(),
        location: { lat: 33.7405, lng: -118.2715, region: "California" },
        description: "Truck queues 3x normal length. Rail cargo backlog growing. Labor shortage detected.",
      },
    ],
    expectedSignals: {
      instruments: ["ZIM", "MATX", "FDX", "UPS", "AMZN"],
      directions: ["short shipping", "long logistics", "short retail"],
      rationale: "Port congestion typically pressures shipping rates up but hurts retailers",
    },
  },

  // Scenario 2: Agricultural Crisis
  agriculturalShock: {
    name: "Global Food Supply Shock",
    description: "Drought and conflict affecting major grain regions",
    anomalies: [
      {
        aoi_id: "farm_ukraine_wheat",
        aoi_name: "Ukraine Wheat Belt",
        domain: "farm" as const,
        magnitude: 0.92,
        confidence: 0.96,
        baseline: 0.18,
        timestamp: new Date().toISOString(),
        location: { lat: 48.3794, lng: 31.1656, region: "Ukraine" },
        description: "Military activity near grain silos. Export corridors blocked. 30% harvest at risk.",
      },
      {
        aoi_id: "farm_brazil_soy",
        aoi_name: "Mato Grosso Soybean Region",
        domain: "farm" as const,
        magnitude: 0.71,
        confidence: 0.83,
        baseline: 0.28,
        timestamp: new Date().toISOString(),
        location: { lat: -15.6014, lng: -56.0979, region: "Brazil" },
        description: "Severe drought conditions. NDVI 40% below 5-year average. Yield loss expected.",
      },
    ],
    expectedSignals: {
      instruments: ["WEAT", "CORN", "SOYB", "DBA", "ADM", "BG"],
      directions: ["long grains", "long ag futures", "short food processors"],
      rationale: "Supply disruption drives commodity prices higher, pressures margins",
    },
  },

  // Scenario 3: Energy Infrastructure Attack
  energyDisruption: {
    name: "Energy Infrastructure Disruption",
    description: "Refinery outage and pipeline issues",
    anomalies: [
      {
        aoi_id: "energy_houston_refinery",
        aoi_name: "Houston Refinery Complex",
        domain: "energy" as const,
        magnitude: 0.85,
        confidence: 0.91,
        baseline: 0.12,
        timestamp: new Date().toISOString(),
        location: { lat: 29.7604, lng: -95.3698, region: "Texas" },
        description: "Major fire detected. Thermal anomaly 500% above normal. 600k bpd capacity offline.",
      },
      {
        aoi_id: "energy_cushing_storage",
        aoi_name: "Cushing Oil Storage Hub",
        domain: "energy" as const,
        magnitude: 0.63,
        confidence: 0.85,
        baseline: 0.45,
        timestamp: new Date().toISOString(),
        location: { lat: 35.9826, lng: -96.7704, region: "Oklahoma" },
        description: "Storage tanks at 85% capacity. Pipeline flow reduced 30%. Inventory build detected.",
      },
    ],
    expectedSignals: {
      instruments: ["XLE", "USO", "RBG", "XOM", "CVX", "VLO"],
      directions: ["long crude", "short refiners", "long gasoline futures"],
      rationale: "Refinery outage tightens product markets while crude builds",
    },
  },

  // Scenario 4: Mining Supply Shock
  miningDisruption: {
    name: "Critical Minerals Supply Shock",
    description: "Copper and lithium mining disruptions",
    anomalies: [
      {
        aoi_id: "mine_chile_copper",
        aoi_name: "Atacama Copper Belt",
        domain: "mine" as const,
        magnitude: 0.79,
        confidence: 0.87,
        baseline: 0.31,
        timestamp: new Date().toISOString(),
        location: { lat: -24.2500, lng: -69.0667, region: "Chile" },
        description: "Strike at major mines. Truck activity down 70%. Production halt likely 2-3 weeks.",
      },
      {
        aoi_id: "mine_australia_lithium",
        aoi_name: "Pilbara Lithium Operations",
        domain: "mine" as const,
        magnitude: 0.68,
        confidence: 0.82,
        baseline: 0.38,
        timestamp: new Date().toISOString(),
        location: { lat: -21.1700, lng: 119.7500, region: "W. Australia" },
        description: "Environmental protest blocking access. Rail shipments halted. Force majeure likely.",
      },
    ],
    expectedSignals: {
      instruments: ["COPX", "FCX", "LIT", "SCCO", "TECK", "BHP"],
      directions: ["long copper", "long lithium", "short EV makers"],
      rationale: "Supply disruption in critical minerals impacts downstream industries",
    },
  },

  // Scenario 5: Complex Multi-Domain Crisis
  complexCrisis: {
    name: "Multi-Domain Supply Crisis",
    description: "Simultaneous disruptions across multiple sectors",
    anomalies: [
      {
        aoi_id: "port_singapore",
        aoi_name: "Singapore Port",
        domain: "port" as const,
        magnitude: 0.72,
        confidence: 0.86,
        baseline: 0.29,
        timestamp: new Date().toISOString(),
        location: { lat: 1.2655, lng: 103.8186, region: "Singapore" },
        description: "COVID outbreak. Terminal operations at 60%. Transshipment delays 5-7 days.",
      },
      {
        aoi_id: "mine_indonesia_nickel",
        aoi_name: "Sulawesi Nickel Mines",
        domain: "mine" as const,
        magnitude: 0.84,
        confidence: 0.90,
        baseline: 0.24,
        timestamp: new Date().toISOString(),
        location: { lat: -2.5489, lng: 121.0770, region: "Indonesia" },
        description: "Export ban announced. Stockpiles depleting. Stainless steel supply chain impact.",
      },
      {
        aoi_id: "energy_strait_hormuz",
        aoi_name: "Strait of Hormuz",
        domain: "energy" as const,
        magnitude: 0.77,
        confidence: 0.89,
        baseline: 0.15,
        timestamp: new Date().toISOString(),
        location: { lat: 26.5667, lng: 56.2500, region: "Persian Gulf" },
        description: "Tanker traffic 40% below normal. Military activity detected. Insurance rates spiking.",
      },
    ],
    expectedSignals: {
      instruments: ["VIX", "GLD", "DXY", "SPY", "EEM", "USO"],
      directions: ["long volatility", "long gold", "short emerging markets"],
      rationale: "Multiple supply shocks create systemic risk, flight to safety",
    },
  },
};

/**
 * Main validation action
 */
export const validateSignals = action({
  args: {
    scenario: v.optional(v.union(
      v.literal("supplyChainCrisis"),
      v.literal("agriculturalShock"),
      v.literal("energyDisruption"),
      v.literal("miningDisruption"),
      v.literal("complexCrisis"),
      v.literal("all")
    )),
    verbose: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const scenarioName = args.scenario || "complexCrisis";
    const verbose = args.verbose ?? true;
    
    console.log("\n" + "=".repeat(80));
    console.log("🎯 TRADING SIGNAL VALIDATION TEST");
    console.log("=".repeat(80));
    
    const scenarios = scenarioName === "all" 
      ? Object.keys(SCENARIOS) 
      : [scenarioName];
    
    const results: any[] = [];
    
    for (const name of scenarios) {
      const scenario = SCENARIOS[name as keyof typeof SCENARIOS];
      
      console.log(`\n📊 Testing: ${scenario.name}`);
      console.log(`📝 ${scenario.description}`);
      console.log(`🌍 Anomalies: ${scenario.anomalies.length} detected`);
      
      if (verbose) {
        scenario.anomalies.forEach((a, i) => {
          console.log(`   ${i+1}. ${a.aoi_name}: ${a.description.substring(0, 80)}...`);
        });
      }
      
      try {
        // Generate signals
        console.log("\n⚙️ Generating trading signals...");
        const startTime = Date.now();
        
        const response = await ctx.runAction(api.tradingSignals.generateTradingSignals, {
          anomalies: scenario.anomalies,
          max_signals: 5,
          market_context: {
            vix_level: 25,
            dollar_index: 102,
            commodity_trends: ["Inflation concerns", "Supply chain stress"],
            geopolitical_events: ["Global tensions elevated"],
          },
        });
        
        const elapsed = Date.now() - startTime;
        console.log(`✅ Generated ${response.signals.length} signals in ${elapsed}ms`);
        
        // Validate signals
        const validation = validateSignalQuality(
          response.signals,
          scenario.anomalies,
          scenario.expectedSignals
        );
        
        if (verbose) {
          console.log("\n📈 Generated Signals:");
          response.signals.forEach((s, i) => {
            console.log(`   ${i+1}. ${s.instrument} - ${s.direction.toUpperCase()}`);
            console.log(`      Confidence: ${(s.confidence * 100).toFixed(0)}%`);
            console.log(`      ${s.rationale.substring(0, 100)}...`);
          });
          
          console.log("\n✅ Validation Results:");
          console.log(`   Plausibility: ${validation.plausibilityScore}/10`);
          console.log(`   Market Relevance: ${validation.marketRelevance}`);
          console.log(`   Signal Quality: ${validation.quality}`);
          
          if (validation.matches.length > 0) {
            console.log(`   ✅ Expected Matches: ${validation.matches.join(", ")}`);
          }
          if (validation.issues.length > 0) {
            console.log(`   ⚠️ Issues: ${validation.issues.join("; ")}`);
          }
        }
        
        results.push({
          scenario: scenario.name,
          success: true,
          signalCount: response.signals.length,
          validation,
          topSignal: response.signals[0],
          processingTime: elapsed,
        });
        
      } catch (error) {
        console.error(`❌ Error: ${error}`);
        results.push({
          scenario: scenario.name,
          success: false,
          error: String(error),
        });
      }
    }
    
    // Summary
    console.log("\n" + "=".repeat(80));
    console.log("📊 VALIDATION SUMMARY");
    console.log("=".repeat(80));
    
    const successful = results.filter(r => r.success);
    console.log(`✅ Success Rate: ${successful.length}/${results.length}`);
    
    if (successful.length > 0) {
      const avgPlausibility = successful.reduce((sum, r) => 
        sum + r.validation.plausibilityScore, 0) / successful.length;
      console.log(`📈 Avg Plausibility: ${avgPlausibility.toFixed(1)}/10`);
      
      const highQuality = successful.filter(r => 
        r.validation.quality === "High" || r.validation.quality === "Good"
      );
      console.log(`⭐ High Quality Signals: ${highQuality.length}/${successful.length}`);
    }
    
    return {
      success: successful.length === results.length,
      scenarios: results,
      summary: {
        tested: results.length,
        passed: successful.length,
        failed: results.length - successful.length,
        averagePlausibility: successful.length > 0 
          ? successful.reduce((s, r) => s + r.validation.plausibilityScore, 0) / successful.length
          : 0,
      },
    };
  },
});

/**
 * Validate signal quality and relevance
 */
function validateSignalQuality(
  signals: any[],
  anomalies: any[],
  expected: any
): any {
  const validation = {
    plausibilityScore: 5, // Start neutral
    marketRelevance: "Unknown",
    quality: "Unknown",
    matches: [] as string[],
    issues: [] as string[],
  };
  
  if (signals.length === 0) {
    validation.issues.push("No signals generated");
    validation.plausibilityScore = 0;
    return validation;
  }
  
  // Check instrument validity
  signals.forEach(signal => {
    // Check if instrument matches expected patterns
    if (expected.instruments.some((exp: string) => 
      signal.instrument.includes(exp) || exp.includes(signal.instrument)
    )) {
      validation.matches.push(signal.instrument);
      validation.plausibilityScore += 0.5;
    }
    
    // Validate ticker format
    if (!/^[A-Z]{1,5}$/.test(signal.instrument) && 
        !signal.instrument.includes('/') && 
        !['VIX', 'DXY'].includes(signal.instrument)) {
      validation.issues.push(`Invalid ticker: ${signal.instrument}`);
      validation.plausibilityScore -= 0.5;
    }
  });
  
  // Check direction logic
  const anomalySeverity = Math.max(...anomalies.map(a => a.magnitude));
  if (anomalySeverity > 0.8) {
    // Severe anomalies should trigger defensive positioning
    const defensiveSignals = signals.filter(s => 
      s.direction === 'short' || 
      ['VIX', 'GLD', 'DXY'].includes(s.instrument)
    );
    if (defensiveSignals.length > 0) {
      validation.plausibilityScore += 1;
    } else {
      validation.issues.push("Missing defensive positioning for severe anomalies");
      validation.plausibilityScore -= 1;
    }
  }
  
  // Check confidence distribution
  const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
  if (avgConfidence > 0.9) {
    validation.issues.push("Unrealistically high confidence");
    validation.plausibilityScore -= 1;
  } else if (avgConfidence > 0.5 && avgConfidence < 0.8) {
    validation.plausibilityScore += 0.5;
  }
  
  // Check rationale quality
  const goodRationales = signals.filter(s => 
    s.rationale.length > 50 && 
    s.rationale.toLowerCase().includes(anomalies[0].domain)
  );
  if (goodRationales.length === signals.length) {
    validation.plausibilityScore += 1;
  }
  
  // Determine market relevance
  const liquidInstruments = signals.filter(s => 
    ['SPY', 'QQQ', 'GLD', 'USO', 'DBA', 'XLE', 'XLF'].includes(s.instrument) ||
    expected.instruments.includes(s.instrument)
  );
  
  validation.marketRelevance = liquidInstruments.length > signals.length * 0.6 
    ? "High" 
    : liquidInstruments.length > signals.length * 0.3 
    ? "Moderate" 
    : "Low";
  
  // Determine overall quality
  validation.plausibilityScore = Math.max(0, Math.min(10, validation.plausibilityScore));
  
  if (validation.plausibilityScore >= 7) {
    validation.quality = "High";
  } else if (validation.plausibilityScore >= 5) {
    validation.quality = "Good";
  } else if (validation.plausibilityScore >= 3) {
    validation.quality = "Fair";
  } else {
    validation.quality = "Poor";
  }
  
  return validation;
}

/**
 * Quick test with single anomaly
 */
export const quickTest = action({
  args: {},
  handler: async (ctx) => {
    console.log("🚀 Quick Signal Test");
    
    const anomaly = {
      aoi_id: "test_port",
      aoi_name: "Test Port",
      domain: "port" as const,
      magnitude: 0.75,
      confidence: 0.85,
      baseline: 0.3,
      timestamp: new Date().toISOString(),
      description: "Major congestion detected",
    };
    
    const result = await ctx.runAction(api.tradingSignals.generateTradingSignals, {
      anomalies: [anomaly],
      max_signals: 1,
    });
    
    console.log("Result:", result.signals[0]);
    return result.signals[0];
  },
});
