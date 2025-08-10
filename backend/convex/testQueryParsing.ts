/**
 * Test Suite for Natural Language Query Parsing
 * Verifies that various queries produce correct API parameters
 */

import { v } from "convex/values";
import { action } from "./_generated/server";
import { convertToApiParams } from "./queryToApiParams";
import { parseWithRules } from "./parseNaturalLanguageQuery";

// Test cases with expected outputs
const testQueries = [
  {
    query: "Show me large changes in South American soy farms in the last month",
    expected: {
      domains: ["farm"],
      regions: ["southAmerica"],
      countries: ["Brazil", "Argentina", "Chile", "Peru", "Colombia", "Venezuela"],
      timeframe: { days: 30, period: "month" },
      magnitude: { min: 0.7, max: 1.0 },
      keywords: ["soy"],
      interpretation: "Large agricultural changes in South America over 30 days"
    }
  },
  {
    query: "Critical port disruptions in Asia today",
    expected: {
      domains: ["port"],
      regions: ["asia"],
      severity: "critical",
      timeframe: { period: "today" },
      magnitude: { min: 0.85, max: 1.0 },
      interpretation: "Critical port anomalies in Asia from today"
    }
  },
  {
    query: "Find high confidence mining anomalies in copper mines with magnitude above 0.8",
    expected: {
      domains: ["mine"],
      keywords: ["copper"],
      confidence: { min: 0.8, max: 1.0 },
      magnitude: { min: 0.8, max: 1.0 },
      interpretation: "High confidence mining anomalies with significant magnitude"
    }
  },
  {
    query: "Show energy sector anomalies in the Middle East from the past week",
    expected: {
      domains: ["energy"],
      regions: ["middleEast"],
      timeframe: { days: 7, period: "week" },
      interpretation: "Energy anomalies in Middle East over 7 days"
    }
  },
  {
    query: "Recent oil refinery outages in Texas",
    expected: {
      domains: ["energy"],
      regions: ["northAmerica"],
      countries: ["United States"],
      keywords: ["oil", "refinery", "outages", "Texas"],
      interpretation: "Recent energy disruptions in North America"
    }
  },
  {
    query: "Compare wheat production anomalies between Ukraine and Brazil last 3 months",
    expected: {
      domains: ["farm"],
      keywords: ["wheat", "production", "Ukraine", "Brazil"],
      timeframe: { days: 90, period: "3_months" },
      regions: ["europe", "southAmerica"],
      interpretation: "Agricultural comparison between regions over 90 days"
    }
  },
  {
    query: "Show all anomalies with confidence > 0.7 and magnitude > 0.6",
    expected: {
      domains: ["port", "farm", "mine", "energy"], // All domains
      confidence: { min: 0.7, max: 1.0 },
      magnitude: { min: 0.6, max: 1.0 },
      interpretation: "All high-confidence, significant anomalies"
    }
  },
  {
    query: "Major shipping congestion at Singapore port yesterday",
    expected: {
      domains: ["port"],
      regions: ["asia"],
      countries: ["Singapore"],
      keywords: ["shipping", "congestion"],
      timeframe: { period: "yesterday" },
      severity: "high",
      interpretation: "Port congestion in Singapore yesterday"
    }
  },
  {
    query: "Small shifts in African gold mines over the past fortnight",
    expected: {
      domains: ["mine"],
      regions: ["africa"],
      keywords: ["gold"],
      timeframe: { days: 14, period: "fortnight" },
      magnitude: { min: 0.2, max: 0.4 },
      interpretation: "Minor mining changes in Africa over 14 days"
    }
  },
  {
    query: "Extreme weather impact on Brazilian coffee farms last week",
    expected: {
      domains: ["farm"],
      regions: ["southAmerica"],
      countries: ["Brazil"],
      keywords: ["coffee", "weather"],
      timeframe: { days: 7, period: "week" },
      magnitude: { min: 0.9, max: 1.0 },
      severity: "critical",
      interpretation: "Extreme agricultural impacts in Brazil"
    }
  }
];

/**
 * Test individual query parsing
 */
export const testQueryParsing = action({
  args: {
    query: v.string(),
    verbose: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      // Parse the query
      const parsed = await ctx.runAction("parseNaturalLanguageQuery", {
        query: args.query,
        useAI: false, // Test rule-based parsing first
      });
      
      // Convert to API parameters
      const apiParams = convertToApiParams(parsed);
      
      // Build query string
      const queryString = apiParams ? 
        Object.entries(apiParams)
          .filter(([_, v]) => v !== undefined && v !== null)
          .map(([k, v]) => {
            if (Array.isArray(v)) return `${k}=[${v.join(',')}]`;
            return `${k}=${v}`;
          })
          .join('&') : '';
      
      const result = {
        success: true,
        query: args.query,
        parsed: {
          domains: parsed.domains,
          regions: parsed.regions,
          timeframe: parsed.timeframe,
          severity: parsed.severity,
          confidence: parsed.confidence,
          magnitude: parsed.magnitude,
          keywords: parsed.keywords,
          sortBy: parsed.sortBy,
          limit: parsed.limit,
        },
        apiParams: {
          domains: apiParams.domains,
          start_date: apiParams.start_date,
          end_date: apiParams.end_date,
          regions: apiParams.regions,
          countries: apiParams.countries,
          severity: apiParams.severity,
          confidence_min: apiParams.confidence_min,
          confidence_max: apiParams.confidence_max,
          magnitude_min: apiParams.magnitude_min,
          magnitude_max: apiParams.magnitude_max,
          keywords: apiParams.keywords,
          sort_by: apiParams.sort_by,
          sort_order: apiParams.sort_order,
          limit: apiParams.limit,
        },
        interpretation: parsed.interpretation,
        queryString: queryString.substring(0, 200) + (queryString.length > 200 ? '...' : ''),
      };
      
      if (args.verbose) {
        console.log('\n' + '='.repeat(80));
        console.log('QUERY:', args.query);
        console.log('-'.repeat(80));
        console.log('PARSED:');
        console.log(JSON.stringify(result.parsed, null, 2));
        console.log('-'.repeat(80));
        console.log('API PARAMS:');
        console.log(JSON.stringify(result.apiParams, null, 2));
        console.log('-'.repeat(80));
        console.log('INTERPRETATION:', result.interpretation);
        console.log('='.repeat(80));
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        query: args.query,
        error: error instanceof Error ? error.message : 'Failed to parse query',
      };
    }
  },
});

/**
 * Run all test cases
 */
export const runAllTests = action({
  args: {
    verbose: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const results = [];
    let passed = 0;
    let failed = 0;
    
    console.log('\n🧪 Running Natural Language Query Tests...\n');
    
    for (const testCase of testQueries) {
      const result = await ctx.runAction("testQueryParsing", {
        query: testCase.query,
        verbose: false,
      });
      
      // Validate against expected values
      const validation = validateResult(result, testCase.expected);
      
      if (validation.passed) {
        passed++;
        console.log(`✅ PASS: "${testCase.query.substring(0, 50)}..."`);
      } else {
        failed++;
        console.log(`❌ FAIL: "${testCase.query.substring(0, 50)}..."`);
        if (args.verbose) {
          console.log(`   Issues: ${validation.issues.join(', ')}`);
        }
      }
      
      results.push({
        query: testCase.query,
        passed: validation.passed,
        issues: validation.issues,
        result: args.verbose ? result : undefined,
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`📊 Test Results: ${passed} passed, ${failed} failed out of ${testQueries.length} tests`);
    console.log(`✨ Success Rate: ${((passed / testQueries.length) * 100).toFixed(1)}%`);
    console.log('='.repeat(80) + '\n');
    
    return {
      totalTests: testQueries.length,
      passed,
      failed,
      successRate: (passed / testQueries.length) * 100,
      results: args.verbose ? results : undefined,
    };
  },
});

/**
 * Validate parsing result against expected values
 */
function validateResult(result: any, expected: any): { passed: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (!result.success) {
    issues.push('Query parsing failed');
    return { passed: false, issues };
  }
  
  // Check domains
  if (expected.domains) {
    const parsedDomains = result.parsed.domains || [];
    const expectedSet = new Set(expected.domains);
    const parsedSet = new Set(parsedDomains);
    
    if (expectedSet.size !== parsedSet.size || 
        ![...expectedSet].every(d => parsedSet.has(d))) {
      issues.push(`Domains mismatch: expected [${expected.domains}], got [${parsedDomains}]`);
    }
  }
  
  // Check regions
  if (expected.regions) {
    const parsedRegions = result.parsed.regions || [];
    const hasExpectedRegions = expected.regions.every((r: string) => 
      parsedRegions.includes(r)
    );
    if (!hasExpectedRegions) {
      issues.push(`Regions mismatch: expected [${expected.regions}], got [${parsedRegions}]`);
    }
  }
  
  // Check timeframe
  if (expected.timeframe) {
    if (expected.timeframe.days) {
      const parsedPeriod = result.parsed.timeframe?.period;
      if (!parsedPeriod || !parsedPeriod.includes(String(expected.timeframe.days))) {
        issues.push(`Timeframe mismatch: expected ${expected.timeframe.days} days`);
      }
    }
  }
  
  // Check magnitude
  if (expected.magnitude) {
    const parsedMag = result.parsed.magnitude;
    if (!parsedMag) {
      issues.push('Magnitude not parsed');
    } else {
      if (expected.magnitude.min && Math.abs(parsedMag.min - expected.magnitude.min) > 0.1) {
        issues.push(`Magnitude min mismatch: expected ${expected.magnitude.min}, got ${parsedMag.min}`);
      }
    }
  }
  
  // Check confidence
  if (expected.confidence) {
    const parsedConf = result.parsed.confidence;
    if (!parsedConf) {
      issues.push('Confidence not parsed');
    } else {
      if (expected.confidence.min && Math.abs(parsedConf.min - expected.confidence.min) > 0.1) {
        issues.push(`Confidence min mismatch: expected ${expected.confidence.min}, got ${parsedConf.min}`);
      }
    }
  }
  
  // Check severity
  if (expected.severity) {
    if (result.parsed.severity !== expected.severity) {
      issues.push(`Severity mismatch: expected ${expected.severity}, got ${result.parsed.severity}`);
    }
  }
  
  // Check if critical keywords were captured
  if (expected.keywords) {
    const parsedKeywords = result.parsed.keywords || [];
    const missingKeywords = expected.keywords.filter((k: string) => 
      !parsedKeywords.some((pk: string) => pk.toLowerCase().includes(k.toLowerCase()))
    );
    if (missingKeywords.length > 0) {
      issues.push(`Missing keywords: ${missingKeywords.join(', ')}`);
    }
  }
  
  return {
    passed: issues.length === 0,
    issues,
  };
}

/**
 * Test specific complex query
 */
export const testComplexQuery = action({
  args: {},
  handler: async (ctx) => {
    const complexQuery = "Show me large changes in South American soy farms in the last month";
    
    console.log('\n🔬 Testing Complex Query:');
    console.log(`"${complexQuery}"\n`);
    
    const result = await ctx.runAction("convertQueryToApiParams", {
      query: complexQuery,
      useAI: false,
    });
    
    console.log('📊 Parsing Results:');
    console.log('-'.repeat(60));
    
    console.log('\n1️⃣ INTERPRETATION:');
    console.log(`   "${result.interpretation}"`);
    
    console.log('\n2️⃣ DETECTED ELEMENTS:');
    console.log(`   • Domains: ${result.params.domains || ['all']}`);
    console.log(`   • Time: ${result.params.start_date ? 'Last 30 days' : 'Not detected'}`);
    console.log(`   • Magnitude: ${result.params.magnitude_min ? `≥${result.params.magnitude_min}` : 'Default (≥0.5)'}`);
    console.log(`   • Regions: ${result.params.regions || 'Not detected'}`);
    console.log(`   • Countries: ${result.params.countries?.slice(0, 3).join(', ')}...`);
    
    console.log('\n3️⃣ API PARAMETERS:');
    const keyParams = {
      domains: result.params.domains,
      start_date: result.params.start_date?.substring(0, 10),
      end_date: result.params.end_date?.substring(0, 10),
      countries: result.params.countries,
      magnitude_min: result.params.magnitude_min,
      magnitude_max: result.params.magnitude_max,
      keywords: result.params.keywords,
    };
    console.log(JSON.stringify(keyParams, null, 2));
    
    console.log('\n4️⃣ QUERY STRING:');
    console.log(`   ${result.queryString.substring(0, 150)}...`);
    
    console.log('\n✅ Test Complete!\n');
    
    return result;
  },
});

/**
 * Interactive query tester
 */
export const testInteractive = action({
  args: {
    queries: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const results = [];
    
    console.log('\n🎯 Interactive Query Testing\n');
    
    for (const query of args.queries) {
      console.log(`\nTesting: "${query}"`);
      console.log('-'.repeat(60));
      
      const result = await ctx.runAction("convertQueryToApiParams", {
        query,
        useAI: false,
      });
      
      console.log(`✓ Domains: ${result.params.domains || 'all'}`);
      console.log(`✓ Time Range: ${result.params.start_date?.substring(0, 10)} to ${result.params.end_date?.substring(0, 10)}`);
      console.log(`✓ Magnitude: ${result.params.magnitude_min || 0.5} - ${result.params.magnitude_max || 1.0}`);
      console.log(`✓ Confidence: ${result.params.confidence_min || 0.5} - ${result.params.confidence_max || 1.0}`);
      
      if (result.params.countries) {
        console.log(`✓ Countries: ${result.params.countries.join(', ')}`);
      }
      
      results.push({
        query,
        success: true,
        params: result.params,
      });
    }
    
    return results;
  },
});
