/**
 * Natural Language Query Parser for Satellite Anomaly Detection
 * Converts user queries into structured search parameters
 */

import { v } from "convex/values";
import { action } from "./_generated/server";
import OpenAI from 'openai';
import { QUERY_DEFAULTS, applyQueryDefaults } from "./queryDefaults";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Domain keywords mapping
const DOMAIN_KEYWORDS = {
  port: ['port', 'ports', 'shipping', 'vessel', 'container', 'harbor', 'maritime', 'dock', 'terminal', 'cargo'],
  farm: ['farm', 'agriculture', 'crop', 'harvest', 'grain', 'wheat', 'corn', 'soy', 'rice', 'field', 'plantation'],
  mine: ['mine', 'mining', 'copper', 'gold', 'iron', 'lithium', 'nickel', 'extraction', 'quarry', 'mineral'],
  energy: ['energy', 'oil', 'gas', 'refinery', 'pipeline', 'lng', 'power', 'nuclear', 'coal', 'solar', 'wind'],
};

// Region mapping
const REGION_KEYWORDS = {
  asia: ['asia', 'china', 'japan', 'korea', 'singapore', 'indonesia', 'thailand', 'vietnam', 'india'],
  europe: ['europe', 'germany', 'france', 'uk', 'italy', 'spain', 'netherlands', 'belgium', 'poland'],
  northAmerica: ['america', 'usa', 'us', 'canada', 'mexico', 'texas', 'california', 'gulf'],
  southAmerica: ['brazil', 'argentina', 'chile', 'peru', 'colombia', 'venezuela'],
  africa: ['africa', 'egypt', 'nigeria', 'south africa', 'kenya', 'morocco', 'ethiopia'],
  middleEast: ['middle east', 'saudi', 'uae', 'qatar', 'kuwait', 'iran', 'iraq', 'israel'],
  oceania: ['australia', 'new zealand', 'papua', 'fiji'],
};

// Time period parsing
const TIME_PATTERNS = {
  today: /today|now|current/i,
  yesterday: /yesterday/i,
  thisWeek: /this week|past week|last 7 days/i,
  thisMonth: /this month|past month|last 30 days/i,
  lastHour: /last hour|past hour|recent/i,
  custom: /last (\d+) (hours?|days?|weeks?|months?)/i,
};

// Severity keywords
const SEVERITY_KEYWORDS = {
  critical: ['critical', 'severe', 'extreme', 'emergency', 'crisis', 'urgent'],
  high: ['high', 'major', 'significant', 'important', 'serious'],
  moderate: ['moderate', 'medium', 'normal', 'typical'],
  low: ['low', 'minor', 'small', 'slight', 'minimal'],
};

// Market impact keywords
const MARKET_KEYWORDS = {
  bullish: ['bullish', 'long', 'buy', 'upward', 'positive', 'growth'],
  bearish: ['bearish', 'short', 'sell', 'downward', 'negative', 'decline'],
  trading: ['trade', 'trading', 'signal', 'investment', 'market', 'price'],
};

export interface ParsedQuery {
  domains: string[];
  regions: string[];
  timeframe: {
    start?: string;
    end?: string;
    period?: string;
  };
  severity?: string;
  confidence?: {
    min?: number;
    max?: number;
  };
  magnitude?: {
    min?: number;
    max?: number;
  };
  aois?: string[];
  keywords: string[];
  marketIntent?: 'bullish' | 'bearish' | 'analysis';
  sortBy?: 'magnitude' | 'confidence' | 'timestamp' | 'relevance';
  limit?: number;
  includeSignals?: boolean;
  naturalLanguage: string;
  interpretation: string;
}

/**
 * Main function to parse natural language queries
 */
export const parseNaturalLanguageQuery = action({
  args: {
    query: v.string(),
    useAI: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<ParsedQuery> => {
    const { query, useAI = true } = args;
    
    console.log(`Parsing query: "${query}"`);
    
    // Start with rule-based parsing
    let parsed = parseWithRules(query);
    
    // Enhance with AI if enabled and query is complex
    if (useAI && isComplexQuery(query)) {
      try {
        const aiEnhanced = await enhanceWithAI(query, parsed);
        parsed = mergeParsingResults(parsed, aiEnhanced);
      } catch (error) {
        console.error("AI enhancement failed, using rule-based parsing only:", error);
      }
    }
    
    // Add interpretation
    parsed.interpretation = generateInterpretation(parsed);
    parsed.naturalLanguage = query;
    
    console.log("Parsed result:", JSON.stringify(parsed, null, 2));
    
    return parsed;
  },
});

/**
 * Rule-based parsing
 */
function parseWithRules(query: string): ParsedQuery {
  const lowerQuery = query.toLowerCase();
  const parsed: ParsedQuery = {
    domains: [],
    regions: [],
    timeframe: {},
    keywords: [],
    sortBy: QUERY_DEFAULTS.sorting.by as ParsedQuery['sortBy'],
    limit: QUERY_DEFAULTS.pagination.limit,
    naturalLanguage: query,
    interpretation: '',
  };
  
  // Extract domains (default to all if none found)
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some(keyword => lowerQuery.includes(keyword))) {
      parsed.domains.push(domain);
    }
  }
  
  // Use default domains if none were detected
  if (parsed.domains.length === 0) {
    parsed.domains = [...QUERY_DEFAULTS.domains];
  }
  
  // Extract regions
  for (const [region, keywords] of Object.entries(REGION_KEYWORDS)) {
    if (keywords.some(keyword => lowerQuery.includes(keyword))) {
      parsed.regions.push(region);
    }
  }
  
  // Extract time period
  parsed.timeframe = parseTimeframe(lowerQuery);
  
  // Extract severity
  for (const [severity, keywords] of Object.entries(SEVERITY_KEYWORDS)) {
    if (keywords.some(keyword => lowerQuery.includes(keyword))) {
      parsed.severity = severity;
      break;
    }
  }
  
  // Extract magnitude/confidence thresholds (with defaults)
  const magnitudeMatch = lowerQuery.match(/magnitude\s*(>|<|>=|<=|above|below)?\s*(\d*\.?\d+)/);
  if (magnitudeMatch) {
    const operator = magnitudeMatch[1];
    const value = parseFloat(magnitudeMatch[2]);
    parsed.magnitude = operator?.includes('>') || operator === 'above' 
      ? { min: value, max: 1.0 }
      : { min: 0, max: value };
  } else {
    // Use default magnitude threshold
    parsed.magnitude = { 
      min: QUERY_DEFAULTS.magnitude.min, 
      max: QUERY_DEFAULTS.magnitude.max 
    };
  }
  
  const confidenceMatch = lowerQuery.match(/confidence\s*(>|<|>=|<=|above|below)?\s*(\d*\.?\d+)/);
  if (confidenceMatch) {
    const operator = confidenceMatch[1];
    const value = parseFloat(confidenceMatch[2]);
    parsed.confidence = operator?.includes('>') || operator === 'above'
      ? { min: value, max: 1.0 }
      : { min: 0, max: value };
  } else {
    // Use default confidence threshold
    parsed.confidence = { 
      min: QUERY_DEFAULTS.confidence.min, 
      max: 1.0 
    };
  }
  
  // Extract market intent
  const hasBullish = MARKET_KEYWORDS.bullish.some(k => lowerQuery.includes(k));
  const hasBearish = MARKET_KEYWORDS.bearish.some(k => lowerQuery.includes(k));
  const hasTrading = MARKET_KEYWORDS.trading.some(k => lowerQuery.includes(k));
  
  if (hasBullish) parsed.marketIntent = 'bullish';
  else if (hasBearish) parsed.marketIntent = 'bearish';
  else if (hasTrading) parsed.marketIntent = 'analysis';
  
  parsed.includeSignals = hasTrading || hasBullish || hasBearish;
  
  // Extract limit (with max limit enforcement)
  const limitMatch = lowerQuery.match(/(?:top|first|last)\s*(\d+)/);
  if (limitMatch) {
    parsed.limit = Math.min(parseInt(limitMatch[1]), QUERY_DEFAULTS.pagination.maxLimit);
  }
  
  // Extract sorting preference
  if (lowerQuery.includes('recent') || lowerQuery.includes('latest')) {
    parsed.sortBy = 'timestamp';
  } else if (lowerQuery.includes('confident') || lowerQuery.includes('reliable')) {
    parsed.sortBy = 'confidence';
  } else if (lowerQuery.includes('severe') || lowerQuery.includes('significant')) {
    parsed.sortBy = 'magnitude';
  }
  
  // Extract specific AOIs
  const aoiMatch = query.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:port|farm|mine|refinery|plant)/gi);
  if (aoiMatch) {
    parsed.aois = aoiMatch.map(match => match.trim());
  }
  
  // Extract keywords (words not already categorized)
  const words = query.split(/\s+/);
  const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'from', 'by', 'show', 'find', 'get', 'list'];
  parsed.keywords = words
    .filter(word => word.length > 2 && !stopWords.includes(word.toLowerCase()))
    .slice(0, 5);
  
  return parsed;
}

/**
 * Parse timeframe from query
 */
function parseTimeframe(query: string): ParsedQuery['timeframe'] {
  const now = new Date();
  const timeframe: ParsedQuery['timeframe'] = {};
  
  if (TIME_PATTERNS.today.test(query)) {
    timeframe.start = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    timeframe.period = 'today';
  } else if (TIME_PATTERNS.yesterday.test(query)) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    timeframe.start = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
    timeframe.end = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString();
    timeframe.period = 'yesterday';
  } else if (TIME_PATTERNS.thisWeek.test(query)) {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    timeframe.start = weekAgo.toISOString();
    timeframe.period = 'week';
  } else if (TIME_PATTERNS.thisMonth.test(query)) {
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    timeframe.start = monthAgo.toISOString();
    timeframe.period = 'month';
  } else if (TIME_PATTERNS.lastHour.test(query)) {
    const hourAgo = new Date(now);
    hourAgo.setHours(hourAgo.getHours() - 1);
    timeframe.start = hourAgo.toISOString();
    timeframe.period = 'hour';
  } else {
    // Check for custom period
    const customMatch = query.match(TIME_PATTERNS.custom);
    if (customMatch) {
      const amount = parseInt(customMatch[1]);
      const unit = customMatch[2].toLowerCase();
      const startDate = new Date(now);
      
      if (unit.includes('hour')) {
        startDate.setHours(startDate.getHours() - amount);
      } else if (unit.includes('day')) {
        startDate.setDate(startDate.getDate() - amount);
      } else if (unit.includes('week')) {
        startDate.setDate(startDate.getDate() - (amount * 7));
      } else if (unit.includes('month')) {
        startDate.setMonth(startDate.getMonth() - amount);
      }
      
      timeframe.start = startDate.toISOString();
      timeframe.period = `${amount}_${unit}`;
    }
  }
  
  // Set end time if not specified
  if (timeframe.start && !timeframe.end) {
    timeframe.end = now.toISOString();
  }
  
  // If no timeframe was detected, use default 14-day window
  if (!timeframe.start && !timeframe.end) {
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - QUERY_DEFAULTS.timeWindow.days);
    timeframe.start = defaultStart.toISOString();
    timeframe.end = now.toISOString();
    timeframe.period = `${QUERY_DEFAULTS.timeWindow.days}_days`;
  }
  
  return timeframe;
}

/**
 * Check if query is complex enough to warrant AI enhancement
 */
function isComplexQuery(query: string): boolean {
  // Complex if:
  // - Contains multiple clauses
  // - Has comparison operators
  // - References multiple domains/regions
  // - Contains market analysis terms
  // - Is longer than 10 words
  
  const words = query.split(/\s+/).length;
  const hasComparison = /compare|versus|vs|between|correlation/i.test(query);
  const hasAnalysis = /analyze|impact|affect|cause|predict|forecast/i.test(query);
  const hasMultiple = /and|or|both|all|any/i.test(query);
  
  return words > 10 || hasComparison || hasAnalysis || hasMultiple;
}

/**
 * Enhance parsing with AI
 */
async function enhanceWithAI(query: string, ruleParsed: ParsedQuery): Promise<Partial<ParsedQuery>> {
  const systemPrompt = `You are a query parser for a satellite anomaly detection system.
Parse user queries to extract:
1. Domains: port, farm, mine, energy
2. Regions: geographic areas or countries
3. Time periods: specific dates or relative times
4. Severity/magnitude thresholds
5. Market intent: bullish, bearish, or analysis
6. Specific AOIs (Areas of Interest)

Return a JSON object with these fields. Be precise and only include what's explicitly mentioned or strongly implied.`;

  const userPrompt = `Parse this query: "${query}"
Current rule-based parsing found:
- Domains: ${ruleParsed.domains.join(', ') || 'none'}
- Regions: ${ruleParsed.regions.join(', ') || 'none'}
- Time: ${ruleParsed.timeframe.period || 'not specified'}

Enhance or correct this parsing. Return JSON only.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 500,
    });
    
    const response = completion.choices[0].message.content;
    if (!response) throw new Error("No AI response");
    
    return JSON.parse(response);
  } catch (error) {
    console.error("AI parsing error:", error);
    throw error;
  }
}

/**
 * Merge rule-based and AI parsing results
 */
function mergeParsingResults(ruleBased: ParsedQuery, aiEnhanced: Partial<ParsedQuery>): ParsedQuery {
  const merged: ParsedQuery = { ...ruleBased };
  
  // Merge domains (union)
  if (aiEnhanced.domains) {
    merged.domains = [...new Set([...ruleBased.domains, ...aiEnhanced.domains])];
  }
  
  // Merge regions (union)
  if (aiEnhanced.regions) {
    merged.regions = [...new Set([...ruleBased.regions, ...aiEnhanced.regions])];
  }
  
  // Use AI timeframe if more specific
  if (aiEnhanced.timeframe && Object.keys(aiEnhanced.timeframe).length > 0) {
    merged.timeframe = { ...merged.timeframe, ...aiEnhanced.timeframe };
  }
  
  // Use AI severity if not detected by rules
  if (aiEnhanced.severity && !merged.severity) {
    merged.severity = aiEnhanced.severity;
  }
  
  // Merge confidence/magnitude (use most restrictive)
  if (aiEnhanced.confidence) {
    merged.confidence = aiEnhanced.confidence;
  }
  if (aiEnhanced.magnitude) {
    merged.magnitude = aiEnhanced.magnitude;
  }
  
  // Add AI-detected AOIs
  if (aiEnhanced.aois) {
    merged.aois = [...new Set([...(merged.aois || []), ...aiEnhanced.aois])];
  }
  
  return merged;
}

/**
 * Generate human-readable interpretation
 */
function generateInterpretation(parsed: ParsedQuery): string {
  const parts: string[] = [];
  
  // Describe what we're looking for
  parts.push("Searching for");
  
  // Severity
  if (parsed.severity) {
    parts.push(`${parsed.severity}-severity`);
  }
  
  // Domains
  if (parsed.domains.length > 0) {
    parts.push(`${parsed.domains.join('/')} anomalies`);
  } else {
    parts.push("anomalies");
  }
  
  // Regions
  if (parsed.regions.length > 0) {
    parts.push(`in ${parsed.regions.join(', ')}`);
  }
  
  // Time
  if (parsed.timeframe.period) {
    parts.push(`from the past ${parsed.timeframe.period}`);
  }
  
  // Thresholds
  const thresholds: string[] = [];
  if (parsed.magnitude?.min) {
    thresholds.push(`magnitude > ${parsed.magnitude.min}`);
  }
  if (parsed.confidence?.min) {
    thresholds.push(`confidence > ${parsed.confidence.min}`);
  }
  if (thresholds.length > 0) {
    parts.push(`with ${thresholds.join(' and ')}`);
  }
  
  // Market intent
  if (parsed.marketIntent) {
    parts.push(`for ${parsed.marketIntent} trading signals`);
  }
  
  // Sorting and limit
  parts.push(`(showing top ${parsed.limit} by ${parsed.sortBy})`);
  
  return parts.join(' ');
}

/**
 * Parse queries with specific intents
 */
export const parseQueryWithIntent = action({
  args: {
    query: v.string(),
    intent: v.optional(v.union(
      v.literal("search"),
      v.literal("analyze"),
      v.literal("trade"),
      v.literal("monitor")
    )),
  },
  handler: async (ctx, args): Promise<ParsedQuery & { intent: string }> => {
    const parsed = await ctx.runAction("parseNaturalLanguageQuery", {
      query: args.query,
      useAI: true,
    });
    
    // Detect intent if not provided
    const intent = args.intent || detectIntent(args.query);
    
    // Adjust parsing based on intent
    switch (intent) {
      case 'trade':
        parsed.includeSignals = true;
        parsed.sortBy = 'magnitude';
        break;
      case 'analyze':
        parsed.limit = 20;
        parsed.sortBy = 'relevance';
        break;
      case 'monitor':
        parsed.timeframe = { period: 'hour', start: new Date(Date.now() - 3600000).toISOString() };
        parsed.sortBy = 'timestamp';
        break;
    }
    
    return { ...parsed, intent };
  },
});

/**
 * Detect user intent from query
 */
function detectIntent(query: string): string {
  const lower = query.toLowerCase();
  
  if (/trade|trading|signal|buy|sell|long|short/i.test(lower)) {
    return 'trade';
  } else if (/analyze|analysis|impact|correlation|trend/i.test(lower)) {
    return 'analyze';
  } else if (/monitor|watch|alert|notify|track/i.test(lower)) {
    return 'monitor';
  } else {
    return 'search';
  }
}

/**
 * Parse batch queries
 */
export const parseBatchQueries = action({
  args: {
    queries: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<ParsedQuery[]> => {
    const results: ParsedQuery[] = [];
    
    for (const query of args.queries) {
      const parsed = await ctx.runAction("parseNaturalLanguageQuery", {
        query,
        useAI: false, // Use rules only for batch processing
      });
      results.push(parsed);
    }
    
    return results;
  },
});

/**
 * Get query suggestions based on partial input
 */
export const getQuerySuggestions = action({
  args: {
    partial: v.string(),
    maxSuggestions: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<string[]> => {
    const { partial, maxSuggestions = 5 } = args;
    const lower = partial.toLowerCase();
    
    const suggestions: string[] = [];
    
    // Common query templates
    const templates = [
      "Show critical anomalies in [region] ports today",
      "Find high-confidence mining disruptions in the last week",
      "Analyze agricultural anomalies in [region] with magnitude > 0.7",
      "Generate trading signals for energy sector anomalies",
      "Monitor port congestion in Asia",
      "Compare farm anomalies between Brazil and Ukraine",
      "Show all anomalies affecting copper mines",
      "Find supply chain disruptions with bearish implications",
      "List recent refinery outages in the Gulf region",
      "Track vessel activity anomalies at Singapore port",
    ];
    
    // Filter and customize templates based on partial input
    for (const template of templates) {
      if (template.toLowerCase().includes(lower) || lower.length < 3) {
        // Customize template based on partial
        let customized = template;
        
        // Replace placeholders
        if (lower.includes('china')) customized = customized.replace('[region]', 'China');
        else if (lower.includes('europe')) customized = customized.replace('[region]', 'Europe');
        else customized = customized.replace('[region]', 'Asia');
        
        suggestions.push(customized);
        
        if (suggestions.length >= maxSuggestions) break;
      }
    }
    
    // Add domain-specific suggestions
    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      if (keywords.some(k => k.startsWith(lower))) {
        suggestions.push(`Show all ${domain} anomalies from today`);
        suggestions.push(`Find high-severity ${domain} disruptions`);
        
        if (suggestions.length >= maxSuggestions) break;
      }
    }
    
    return suggestions.slice(0, maxSuggestions);
  },
});

/**
 * Validate and sanitize parsed query
 */
export const validateParsedQuery = action({
  args: {
    parsed: v.any(),
  },
  handler: async (ctx, args): Promise<{ valid: boolean; errors: string[]; sanitized: ParsedQuery }> => {
    const errors: string[] = [];
    const parsed = args.parsed as ParsedQuery;
    
    // Validate domains
    const validDomains = ['port', 'farm', 'mine', 'energy'];
    parsed.domains = parsed.domains.filter(d => validDomains.includes(d));
    
    // Validate time range
    if (parsed.timeframe.start && parsed.timeframe.end) {
      const start = new Date(parsed.timeframe.start);
      const end = new Date(parsed.timeframe.end);
      
      if (start > end) {
        errors.push("Start time is after end time");
        // Swap them
        [parsed.timeframe.start, parsed.timeframe.end] = [parsed.timeframe.end, parsed.timeframe.start];
      }
      
      // Limit to last 90 days
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      if (start < ninetyDaysAgo) {
        errors.push("Time range limited to last 90 days");
        parsed.timeframe.start = ninetyDaysAgo.toISOString();
      }
    }
    
    // Validate magnitude/confidence ranges
    if (parsed.magnitude) {
      if (parsed.magnitude.min !== undefined) {
        parsed.magnitude.min = Math.max(0, Math.min(1, parsed.magnitude.min));
      }
      if (parsed.magnitude.max !== undefined) {
        parsed.magnitude.max = Math.max(0, Math.min(1, parsed.magnitude.max));
      }
    }
    
    if (parsed.confidence) {
      if (parsed.confidence.min !== undefined) {
        parsed.confidence.min = Math.max(0, Math.min(1, parsed.confidence.min));
      }
      if (parsed.confidence.max !== undefined) {
        parsed.confidence.max = Math.max(0, Math.min(1, parsed.confidence.max));
      }
    }
    
    // Validate limit
    parsed.limit = Math.max(1, Math.min(100, parsed.limit || 10));
    
    // Validate sort
    const validSorts = ['magnitude', 'confidence', 'timestamp', 'relevance'];
    if (!validSorts.includes(parsed.sortBy || '')) {
      parsed.sortBy = 'relevance';
    }
    
    return {
      valid: errors.length === 0,
      errors,
      sanitized: parsed,
    };
  },
});
