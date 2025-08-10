/**
 * Test the Natural Language Query Parser
 */

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// Test queries covering various scenarios
const TEST_QUERIES = [
  // Simple domain queries
  "Show all port anomalies",
  "Find farming disruptions",
  "Mining activities in Chile",
  "Energy sector anomalies today",
  
  // Regional queries
  "Port congestion in Asia",
  "Agricultural problems in Brazil",
  "Mining operations in Australia",
  "Oil refineries in the Gulf",
  
  // Time-based queries
  "Show anomalies from today",
  "What happened yesterday in ports",
  "Last 7 days of farm anomalies",
  "Mining disruptions in the past month",
  "Recent energy sector issues",
  
  // Severity and threshold queries
  "Critical port disruptions",
  "High severity mining anomalies",
  "Show anomalies with magnitude > 0.7",
  "High confidence agricultural signals above 0.8",
  
  // Trading and market queries
  "Generate trading signals for port congestion",
  "Bullish opportunities in agriculture",
  "Short selling signals for energy sector",
  "Market impact of mining disruptions",
  
  // Complex queries
  "Compare port congestion between Shanghai and Singapore in the last week",
  "Analyze correlation between farming disruptions in Brazil and commodity prices",
  "Show critical energy anomalies in Middle East with bearish implications",
  "Find all anomalies affecting copper supply chain with magnitude > 0.6",
  
  // Natural conversational queries
  "What's happening at Shanghai port right now?",
  "Are there any problems with wheat production?",
  "Should I be worried about oil supply?",
  "Find supply chain bottlenecks that could affect shipping stocks",
];

/**
 * Test the query parser with sample queries
 */
export const testQueryParser = action({
  args: {
    testSet: v.optional(v.union(
      v.literal("simple"),
      v.literal("complex"),
      v.literal("all"),
      v.literal("custom")
    )),
    customQuery: v.optional(v.string()),
    verbose: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { testSet = "all", customQuery, verbose = true } = args;
    
    console.log("=" .repeat(80));
    console.log("NATURAL LANGUAGE QUERY PARSER TEST");
    console.log("=" .repeat(80));
    
    let queriesToTest: string[] = [];
    
    if (customQuery) {
      queriesToTest = [customQuery];
    } else if (testSet === "simple") {
      queriesToTest = TEST_QUERIES.slice(0, 10);
    } else if (testSet === "complex") {
      queriesToTest = TEST_QUERIES.slice(-10);
    } else {
      queriesToTest = TEST_QUERIES;
    }
    
    const results = [];
    
    for (const query of queriesToTest) {
      console.log(`\n📝 Query: "${query}"`);
      console.log("-".repeat(60));
      
      try {
        // Parse with rules only (fast)
        const rulesOnly = await ctx.runAction(api.parseNaturalLanguageQuery.parseNaturalLanguageQuery, {
          query,
          useAI: false,
        });
        
        if (verbose) {
          console.log("\n🔧 Rule-based parsing:");
          console.log(`  Domains: ${rulesOnly.domains.join(", ") || "none"}`);
          console.log(`  Regions: ${rulesOnly.regions.join(", ") || "none"}`);
          console.log(`  Time: ${rulesOnly.timeframe.period || "not specified"}`);
          console.log(`  Severity: ${rulesOnly.severity || "not specified"}`);
          if (rulesOnly.magnitude) {
            console.log(`  Magnitude: ${JSON.stringify(rulesOnly.magnitude)}`);
          }
          if (rulesOnly.confidence) {
            console.log(`  Confidence: ${JSON.stringify(rulesOnly.confidence)}`);
          }
          console.log(`  Market Intent: ${rulesOnly.marketIntent || "none"}`);
          console.log(`  Sort: ${rulesOnly.sortBy}, Limit: ${rulesOnly.limit}`);
        }
        
        // Parse with AI enhancement (if complex)
        let aiEnhanced = null;
        if (query.split(" ").length > 8) {
          try {
            aiEnhanced = await ctx.runAction(api.parseNaturalLanguageQuery.parseNaturalLanguageQuery, {
              query,
              useAI: true,
            });
            
            if (verbose) {
              console.log("\n🤖 AI-enhanced parsing:");
              console.log(`  Interpretation: ${aiEnhanced.interpretation}`);
              
              // Show differences
              if (JSON.stringify(aiEnhanced.domains) !== JSON.stringify(rulesOnly.domains)) {
                console.log(`  ✨ Domains: ${aiEnhanced.domains.join(", ")}`);
              }
              if (JSON.stringify(aiEnhanced.regions) !== JSON.stringify(rulesOnly.regions)) {
                console.log(`  ✨ Regions: ${aiEnhanced.regions.join(", ")}`);
              }
            }
          } catch (error) {
            console.log("  ⚠️ AI enhancement failed:", error);
          }
        }
        
        console.log(`\n✅ Interpretation: "${rulesOnly.interpretation}"`);
        
        results.push({
          query,
          success: true,
          parsed: rulesOnly,
          aiEnhanced,
        });
        
      } catch (error) {
        console.error(`❌ Error parsing query:`, error);
        results.push({
          query,
          success: false,
          error: String(error),
        });
      }
    }
    
    // Summary
    console.log("\n" + "=".repeat(80));
    console.log("SUMMARY");
    console.log("=".repeat(80));
    
    const successful = results.filter(r => r.success);
    console.log(`✅ Successfully parsed: ${successful.length}/${results.length}`);
    
    // Analyze parsing coverage
    const coverage = {
      withDomains: successful.filter(r => r.parsed.domains.length > 0).length,
      withRegions: successful.filter(r => r.parsed.regions.length > 0).length,
      withTime: successful.filter(r => r.parsed.timeframe.period).length,
      withSeverity: successful.filter(r => r.parsed.severity).length,
      withMarketIntent: successful.filter(r => r.parsed.marketIntent).length,
    };
    
    console.log("\n📊 Parsing Coverage:");
    console.log(`  Domain detection: ${coverage.withDomains}/${successful.length}`);
    console.log(`  Region detection: ${coverage.withRegions}/${successful.length}`);
    console.log(`  Time detection: ${coverage.withTime}/${successful.length}`);
    console.log(`  Severity detection: ${coverage.withSeverity}/${successful.length}`);
    console.log(`  Market intent: ${coverage.withMarketIntent}/${successful.length}`);
    
    return {
      tested: results.length,
      successful: successful.length,
      failed: results.length - successful.length,
      coverage,
      results: results.slice(0, 5), // Return first 5 for inspection
    };
  },
});

/**
 * Test query suggestions
 */
export const testQuerySuggestions = action({
  args: {
    partials: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const testPartials = args.partials || [
      "port",
      "show crit",
      "trading sig",
      "china",
      "magnitude >",
      "last week",
    ];
    
    console.log("Testing query suggestions...\n");
    
    const results = [];
    
    for (const partial of testPartials) {
      const suggestions = await ctx.runAction(api.parseNaturalLanguageQuery.getQuerySuggestions, {
        partial,
        maxSuggestions: 3,
      });
      
      console.log(`📝 Partial: "${partial}"`);
      suggestions.forEach((s, i) => console.log(`   ${i + 1}. ${s}`));
      console.log();
      
      results.push({ partial, suggestions });
    }
    
    return results;
  },
});

/**
 * Test intent detection
 */
export const testIntentDetection = action({
  args: {},
  handler: async (ctx) => {
    const intentQueries = [
      { query: "Show me port anomalies", expected: "search" },
      { query: "Generate trading signals for energy sector", expected: "trade" },
      { query: "Analyze the impact of mining disruptions", expected: "analyze" },
      { query: "Monitor critical anomalies in real-time", expected: "monitor" },
      { query: "Buy signals for agricultural commodities", expected: "trade" },
      { query: "Track vessel movements at Shanghai", expected: "monitor" },
    ];
    
    console.log("Testing intent detection...\n");
    
    const results = [];
    
    for (const test of intentQueries) {
      const parsed = await ctx.runAction(api.parseNaturalLanguageQuery.parseQueryWithIntent, {
        query: test.query,
      });
      
      const correct = parsed.intent === test.expected;
      console.log(`${correct ? "✅" : "❌"} Query: "${test.query}"`);
      console.log(`   Expected: ${test.expected}, Got: ${parsed.intent}`);
      
      results.push({
        ...test,
        detected: parsed.intent,
        correct,
      });
    }
    
    const accuracy = results.filter(r => r.correct).length / results.length;
    console.log(`\n📊 Intent Detection Accuracy: ${(accuracy * 100).toFixed(0)}%`);
    
    return results;
  },
});

/**
 * Test query validation
 */
export const testQueryValidation = action({
  args: {},
  handler: async (ctx) => {
    const testCases = [
      {
        name: "Valid query",
        parsed: {
          domains: ["port", "farm"],
          regions: ["asia"],
          timeframe: { period: "week" },
          magnitude: { min: 0.5 },
          limit: 20,
          sortBy: "magnitude",
        },
      },
      {
        name: "Invalid domain",
        parsed: {
          domains: ["port", "invalid", "farm"],
          regions: [],
          timeframe: {},
          limit: 200, // Too high
        },
      },
      {
        name: "Invalid time range",
        parsed: {
          domains: ["energy"],
          regions: [],
          timeframe: {
            start: "2025-01-01T00:00:00Z",
            end: "2024-01-01T00:00:00Z", // End before start
          },
        },
      },
      {
        name: "Out of range values",
        parsed: {
          domains: ["mine"],
          magnitude: { min: -0.5, max: 1.5 }, // Outside 0-1
          confidence: { min: 2.0 }, // Too high
          limit: -5, // Negative
        },
      },
    ];
    
    console.log("Testing query validation...\n");
    
    for (const test of testCases) {
      console.log(`📋 Test: ${test.name}`);
      
      const result = await ctx.runAction(api.parseNaturalLanguageQuery.validateParsedQuery, {
        parsed: test.parsed,
      });
      
      console.log(`   Valid: ${result.valid ? "✅" : "❌"}`);
      if (result.errors.length > 0) {
        console.log(`   Errors: ${result.errors.join(", ")}`);
      }
      console.log(`   Sanitized: ${JSON.stringify(result.sanitized, null, 2).substring(0, 200)}...`);
      console.log();
    }
    
    return "Validation tests complete";
  },
});
