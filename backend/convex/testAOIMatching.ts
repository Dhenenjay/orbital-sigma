/**
 * Test AOI Matching functionality
 */

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// Test queries for different matching scenarios
const TEST_QUERIES = {
  // Direct location names
  directNames: [
    "Shanghai Port",
    "Rotterdam",
    "Pilbara mines",
    "Ghawar oil field",
    "Iowa corn fields",
  ],
  
  // Aliases and common references
  aliases: [
    "LA port congestion",
    "Chinese ports",
    "Brazilian agriculture",
    "Texas oil",
    "Australian mining",
  ],
  
  // Descriptive queries
  descriptive: [
    "Major shipping hub in Asia",
    "Copper mining operations in Chile",
    "Wheat production in Ukraine",
    "Oil refineries in the Gulf",
    "Iron ore extraction in Australia",
  ],
  
  // Complex natural language
  naturalLanguage: [
    "What's happening at the port of Singapore?",
    "Show me congestion at Chinese shipping terminals",
    "Are there any issues with Brazilian soybean farms?",
    "Monitor copper production in the Atacama desert",
    "Track vessel activity at major European ports",
  ],
  
  // Ambiguous queries
  ambiguous: [
    "ports",
    "mining",
    "oil",
    "agriculture in Asia",
    "energy production",
  ],
  
  // Location-specific
  geographic: [
    "facilities in China",
    "operations in Brazil",
    "infrastructure in Texas",
    "sites in Australia",
    "locations in Middle East",
  ],
};

/**
 * Test AOI matching with various query types
 */
export const testAOIMatching = action({
  args: {
    testSet: v.optional(v.union(
      v.literal("directNames"),
      v.literal("aliases"),
      v.literal("descriptive"),
      v.literal("naturalLanguage"),
      v.literal("ambiguous"),
      v.literal("geographic"),
      v.literal("all"),
      v.literal("custom")
    )),
    customQuery: v.optional(v.string()),
    verbose: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { testSet = "all", customQuery, verbose = true } = args;
    
    console.log("=" .repeat(80));
    console.log("AOI MATCHING TEST");
    console.log("=" .repeat(80));
    
    // First, ensure we have AOIs in the database
    await ctx.runMutation(api.seedImport.importData, {});
    
    let queriesToTest: string[] = [];
    let testSetName = testSet;
    
    if (customQuery) {
      queriesToTest = [customQuery];
      testSetName = "custom";
    } else if (testSet === "all") {
      queriesToTest = Object.values(TEST_QUERIES).flat();
    } else {
      queriesToTest = TEST_QUERIES[testSet as keyof typeof TEST_QUERIES] || [];
    }
    
    console.log(`Testing ${queriesToTest.length} queries from set: ${testSetName}\n`);
    
    const results = [];
    let successCount = 0;
    let perfectMatches = 0;
    let partialMatches = 0;
    let noMatches = 0;
    
    for (const query of queriesToTest) {
      console.log(`\n📝 Query: "${query}"`);
      console.log("-".repeat(60));
      
      try {
        const result = await ctx.runAction(api.matchAOIs.matchAOIsFromText, {
          text: query,
          maxMatches: 3,
          useAI: query.split(" ").length > 5, // Use AI for complex queries
        });
        
        successCount++;
        
        if (result.matches.length === 0) {
          noMatches++;
          console.log("❌ No matches found");
          
          if (result.suggestions && result.suggestions.length > 0) {
            console.log("💡 Suggestions:");
            result.suggestions.forEach(s => console.log(`   - ${s}`));
          }
        } else {
          if (result.matches[0].confidence >= 0.9) {
            perfectMatches++;
            console.log("✅ Perfect match!");
          } else if (result.matches[0].confidence >= 0.7) {
            partialMatches++;
            console.log("🔶 Good match");
          } else {
            partialMatches++;
            console.log("🔷 Partial match");
          }
          
          if (verbose) {
            console.log("\n📍 Matches:");
            result.matches.forEach((match, idx) => {
              console.log(`   ${idx + 1}. ${match.name} (${match.type})`);
              console.log(`      Confidence: ${(match.confidence * 100).toFixed(0)}%`);
              console.log(`      Reason: ${match.matchReason}`);
              if (match.description) {
                console.log(`      Description: ${match.description.substring(0, 80)}...`);
              }
            });
          }
          
          if (result.interpretedLocation || result.interpretedDomain) {
            console.log("\n🔍 Interpretation:");
            if (result.interpretedLocation) {
              console.log(`   Location: ${result.interpretedLocation}`);
            }
            if (result.interpretedDomain) {
              console.log(`   Domain: ${result.interpretedDomain}`);
            }
          }
        }
        
        results.push({
          query,
          success: true,
          matchCount: result.matches.length,
          topMatch: result.matches[0],
          interpretation: {
            location: result.interpretedLocation,
            domain: result.interpretedDomain,
          },
        });
        
      } catch (error) {
        console.error(`❌ Error: ${error}`);
        results.push({
          query,
          success: false,
          error: String(error),
        });
      }
    }
    
    // Summary statistics
    console.log("\n" + "=".repeat(80));
    console.log("SUMMARY");
    console.log("=".repeat(80));
    
    console.log(`\n📊 Results:`);
    console.log(`   Total Queries: ${queriesToTest.length}`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Perfect Matches (>90%): ${perfectMatches}`);
    console.log(`   Good/Partial Matches: ${partialMatches}`);
    console.log(`   No Matches: ${noMatches}`);
    
    const matchRate = ((perfectMatches + partialMatches) / queriesToTest.length * 100).toFixed(1);
    console.log(`\n🎯 Match Rate: ${matchRate}%`);
    
    // Analyze match quality
    const avgConfidence = results
      .filter(r => r.success && r.topMatch)
      .reduce((sum, r) => sum + r.topMatch.confidence, 0) / 
      results.filter(r => r.success && r.topMatch).length;
    
    console.log(`📈 Average Confidence: ${(avgConfidence * 100).toFixed(1)}%`);
    
    // Most matched AOIs
    const aoiFrequency: Record<string, number> = {};
    results.forEach(r => {
      if (r.topMatch) {
        aoiFrequency[r.topMatch.name] = (aoiFrequency[r.topMatch.name] || 0) + 1;
      }
    });
    
    const topAOIs = Object.entries(aoiFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
    
    if (topAOIs.length > 0) {
      console.log("\n🏆 Most Matched AOIs:");
      topAOIs.forEach(([name, count]) => {
        console.log(`   ${name}: ${count} times`);
      });
    }
    
    return {
      tested: queriesToTest.length,
      successful: successCount,
      perfectMatches,
      partialMatches,
      noMatches,
      matchRate: parseFloat(matchRate),
      avgConfidence,
      results: results.slice(0, 5), // Return first 5 for inspection
    };
  },
});

/**
 * Test fuzzy search functionality
 */
export const testFuzzySearch = action({
  args: {
    searchTerms: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const testTerms = args.searchTerms || [
      "shang",      // Partial: Shanghai
      "brazil",     // Country name
      "copper",     // Commodity type
      "port",       // Domain
      "gulf",       // Geographic feature
      "permian",    // Specific region
    ];
    
    console.log("Testing fuzzy search...\n");
    
    const results = [];
    
    for (const term of testTerms) {
      console.log(`🔍 Search: "${term}"`);
      
      const searchResults = await ctx.runQuery(api.matchAOIs.searchAOIs, {
        searchTerm: term,
        limit: 5,
      });
      
      if (searchResults.length > 0) {
        console.log(`   Found ${searchResults.length} results:`);
        searchResults.forEach((r, i) => {
          console.log(`   ${i + 1}. ${r.name} (score: ${r.relevanceScore})`);
        });
      } else {
        console.log("   No results found");
      }
      console.log();
      
      results.push({
        term,
        resultCount: searchResults.length,
        topResult: searchResults[0],
      });
    }
    
    return results;
  },
});

/**
 * Test batch matching
 */
export const testBatchMatching = action({
  args: {},
  handler: async (ctx) => {
    const batchQueries = [
      "Shanghai port congestion",
      "Brazilian soybean farms",
      "Copper mines in Chile",
      "Oil refineries in Texas",
      "Iron ore in Australia",
    ];
    
    console.log("Testing batch matching...\n");
    console.log(`Processing ${batchQueries.length} queries in batch\n`);
    
    const startTime = Date.now();
    
    const results = await ctx.runAction(api.matchAOIs.batchMatchAOIs, {
      queries: batchQueries,
      maxMatchesPerQuery: 2,
    });
    
    const elapsed = Date.now() - startTime;
    
    results.forEach((result, idx) => {
      console.log(`Query ${idx + 1}: "${result.query}"`);
      if (result.matches.length > 0) {
        console.log(`   Top match: ${result.matches[0].name} (${(result.matches[0].confidence * 100).toFixed(0)}%)`);
      } else {
        console.log("   No matches");
      }
    });
    
    console.log(`\n⏱️ Batch processing time: ${elapsed}ms`);
    console.log(`   Average per query: ${(elapsed / batchQueries.length).toFixed(0)}ms`);
    
    return {
      batchSize: batchQueries.length,
      processingTime: elapsed,
      results,
    };
  },
});

/**
 * Test specific AOI lookup
 */
export const testAOILookup = action({
  args: {
    aoiIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const testIds = args.aoiIds || [
      "port-shanghai",
      "farm-mato-grosso",
      "mine-pilbara",
      "energy-ghawar",
      "invalid-id",
    ];
    
    console.log("Testing AOI lookup by ID...\n");
    
    const results = [];
    
    for (const id of testIds) {
      const aoi = await ctx.runQuery(api.matchAOIs.getAOIById, {
        aoiId: id,
      });
      
      if (aoi) {
        console.log(`✅ ${id}: ${aoi.name} (${aoi.type})`);
        if (aoi.description) {
          console.log(`   ${aoi.description}`);
        }
      } else {
        console.log(`❌ ${id}: Not found`);
      }
      console.log();
      
      results.push({ id, found: !!aoi, aoi });
    }
    
    const foundCount = results.filter(r => r.found).length;
    console.log(`Found ${foundCount}/${testIds.length} AOIs`);
    
    return results;
  },
});
