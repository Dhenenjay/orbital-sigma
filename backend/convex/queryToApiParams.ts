/**
 * Query to API Parameters Converter
 * Converts parsed natural language queries to fetch-embeddings API parameters
 */

import { v } from "convex/values";
import { action } from "./_generated/server";
import { ParsedQuery } from "./parseNaturalLanguageQuery";
import { QUERY_DEFAULTS } from "./queryDefaults";

/**
 * API Parameters interface for /fetch-embeddings endpoint
 */
export interface FetchEmbeddingsParams {
  // Domain filters
  domains?: string[];
  
  // Time range filters
  start_date?: string;
  end_date?: string;
  
  // Location filters
  regions?: string[];
  countries?: string[];
  aois?: string[];
  
  // Anomaly filters
  severity?: string | string[];
  confidence_min?: number;
  confidence_max?: number;
  magnitude_min?: number;
  magnitude_max?: number;
  
  // Sorting and pagination
  sort_by?: "timestamp" | "magnitude" | "confidence" | "severity" | "relevance";
  sort_order?: "asc" | "desc";
  limit?: number;
  offset?: number;
  
  // Additional filters
  keywords?: string[];
  anomaly_types?: string[];
  
  // Market filters (if applicable)
  market_impact?: boolean;
  market_sentiment?: "bullish" | "bearish" | "neutral";
  
  // Include options
  include_metadata?: boolean;
  include_embeddings?: boolean;
  include_signals?: boolean;
  
  // Query context
  query_text?: string;
  query_embedding?: number[];
}

/**
 * Region to country mapping for API
 */
const REGION_TO_COUNTRIES: Record<string, string[]> = {
  asia: ["China", "Japan", "South Korea", "Singapore", "Indonesia", "Thailand", "Vietnam", "India", "Malaysia", "Philippines"],
  europe: ["Germany", "France", "United Kingdom", "Italy", "Spain", "Netherlands", "Belgium", "Poland", "Norway", "Sweden"],
  northAmerica: ["United States", "Canada", "Mexico"],
  southAmerica: ["Brazil", "Argentina", "Chile", "Peru", "Colombia", "Venezuela"],
  africa: ["Egypt", "Nigeria", "South Africa", "Kenya", "Morocco", "Ethiopia", "Algeria"],
  middleEast: ["Saudi Arabia", "UAE", "Qatar", "Kuwait", "Iran", "Iraq", "Israel", "Jordan", "Oman"],
  oceania: ["Australia", "New Zealand", "Papua New Guinea", "Fiji"],
};

/**
 * Convert ParsedQuery to FetchEmbeddingsParams
 */
export function convertToApiParams(parsed: ParsedQuery): FetchEmbeddingsParams {
  const params: FetchEmbeddingsParams = {};
  
  // Map domains
  if (parsed.domains && parsed.domains.length > 0) {
    // Only include if not all domains (optimization)
    if (parsed.domains.length < 4) {
      params.domains = parsed.domains;
    }
  }
  
  // Map time range
  if (parsed.timeframe) {
    if (parsed.timeframe.start) {
      params.start_date = parsed.timeframe.start;
    }
    if (parsed.timeframe.end) {
      params.end_date = parsed.timeframe.end;
    }
    
    // If no dates specified, use defaults
    if (!params.start_date && !params.end_date) {
      const now = new Date();
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - QUERY_DEFAULTS.timeWindow.days);
      params.start_date = twoWeeksAgo.toISOString();
      params.end_date = now.toISOString();
    }
  }
  
  // Map regions to countries
  if (parsed.regions && parsed.regions.length > 0) {
    const countries = new Set<string>();
    for (const region of parsed.regions) {
      const regionCountries = REGION_TO_COUNTRIES[region];
      if (regionCountries) {
        regionCountries.forEach(country => countries.add(country));
      }
    }
    if (countries.size > 0) {
      params.countries = Array.from(countries);
    }
    params.regions = parsed.regions;
  }
  
  // Map AOIs
  if (parsed.aois && parsed.aois.length > 0) {
    params.aois = parsed.aois;
  }
  
  // Map severity
  if (parsed.severity) {
    params.severity = parsed.severity;
  }
  
  // Map confidence thresholds
  if (parsed.confidence) {
    if (parsed.confidence.min !== undefined) {
      params.confidence_min = parsed.confidence.min;
    }
    if (parsed.confidence.max !== undefined) {
      params.confidence_max = parsed.confidence.max;
    }
  }
  
  // Map magnitude thresholds
  if (parsed.magnitude) {
    if (parsed.magnitude.min !== undefined) {
      params.magnitude_min = parsed.magnitude.min;
    }
    if (parsed.magnitude.max !== undefined) {
      params.magnitude_max = parsed.magnitude.max;
    }
  }
  
  // Map sorting
  if (parsed.sortBy) {
    params.sort_by = parsed.sortBy;
    params.sort_order = "desc"; // Default to descending
    
    // Adjust sort order based on sort type
    if (parsed.sortBy === "timestamp") {
      params.sort_order = "desc"; // Most recent first
    }
  }
  
  // Map limit
  if (parsed.limit) {
    params.limit = parsed.limit;
  }
  
  // Map keywords
  if (parsed.keywords && parsed.keywords.length > 0) {
    params.keywords = parsed.keywords;
  }
  
  // Map market intent
  if (parsed.marketIntent) {
    params.market_impact = true;
    params.market_sentiment = parsed.marketIntent === "analysis" ? "neutral" : parsed.marketIntent;
  }
  
  // Include signals if market intent is present
  if (parsed.includeSignals) {
    params.include_signals = true;
  }
  
  // Add query text for context
  if (parsed.naturalLanguage) {
    params.query_text = parsed.naturalLanguage;
  }
  
  // Default includes
  params.include_metadata = true;
  params.include_embeddings = false; // Only include if specifically needed
  
  return params;
}

/**
 * Build URL query string from params
 */
export function buildQueryString(params: FetchEmbeddingsParams): string {
  const queryParts: string[] = [];
  
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    
    if (Array.isArray(value)) {
      // Handle array parameters
      if (value.length > 0) {
        queryParts.push(`${key}=${encodeURIComponent(value.join(','))}`);
      }
    } else if (typeof value === 'boolean') {
      // Handle boolean parameters
      queryParts.push(`${key}=${value}`);
    } else if (typeof value === 'number') {
      // Handle numeric parameters
      queryParts.push(`${key}=${value}`);
    } else {
      // Handle string parameters
      queryParts.push(`${key}=${encodeURIComponent(String(value))}`);
    }
  }
  
  return queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
}

/**
 * Main action to convert natural language to API params
 */
export const convertQueryToApiParams = action({
  args: {
    query: v.string(),
    useAI: v.optional(v.boolean()),
    includeEmbeddings: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Parse the natural language query
    const parsed = await ctx.runAction("parseNaturalLanguageQuery", {
      query: args.query,
      useAI: args.useAI ?? true,
    });
    
    // Convert to API parameters
    const apiParams = convertToApiParams(parsed);
    
    // Include embeddings if requested
    if (args.includeEmbeddings) {
      apiParams.include_embeddings = true;
    }
    
    // Build query string
    const queryString = buildQueryString(apiParams);
    
    return {
      params: apiParams,
      queryString,
      parsed,
      interpretation: parsed.interpretation,
    };
  },
});

/**
 * Get API params with defaults
 */
export const getDefaultApiParams = action({
  args: {},
  handler: async (ctx) => {
    const defaultParams: FetchEmbeddingsParams = {
      // All domains (omitted for optimization)
      // domains: ["port", "farm", "mine", "energy"],
      
      // Last 14 days
      start_date: new Date(Date.now() - QUERY_DEFAULTS.timeWindow.days * 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date().toISOString(),
      
      // Moderate magnitude and confidence
      magnitude_min: QUERY_DEFAULTS.magnitude.min,
      confidence_min: QUERY_DEFAULTS.confidence.min,
      
      // Default sorting and limit
      sort_by: "timestamp",
      sort_order: "desc",
      limit: QUERY_DEFAULTS.pagination.limit,
      
      // Include metadata
      include_metadata: true,
      include_embeddings: false,
      include_signals: false,
    };
    
    const queryString = buildQueryString(defaultParams);
    
    return {
      params: defaultParams,
      queryString,
      description: "Default parameters: all domains, last 14 days, magnitude ≥0.5, confidence ≥0.5",
    };
  },
});

/**
 * Convert specific intent to API params
 */
export const convertIntentToApiParams = action({
  args: {
    intent: v.union(
      v.literal("recent_critical"),
      v.literal("market_analysis"),
      v.literal("domain_specific"),
      v.literal("high_confidence"),
      v.literal("weekly_summary")
    ),
    domain: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let params: FetchEmbeddingsParams = {};
    
    switch (args.intent) {
      case "recent_critical":
        params = {
          start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date().toISOString(),
          severity: ["high", "critical"],
          magnitude_min: 0.7,
          confidence_min: 0.6,
          sort_by: "severity",
          sort_order: "desc",
          limit: 50,
          include_metadata: true,
        };
        break;
        
      case "market_analysis":
        params = {
          start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date().toISOString(),
          magnitude_min: 0.6,
          confidence_min: 0.5,
          market_impact: true,
          include_signals: true,
          sort_by: "magnitude",
          sort_order: "desc",
          limit: 100,
          include_metadata: true,
        };
        break;
        
      case "domain_specific":
        params = {
          domains: args.domain ? [args.domain] : ["port"],
          start_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date().toISOString(),
          magnitude_min: 0.5,
          confidence_min: 0.5,
          sort_by: "timestamp",
          sort_order: "desc",
          limit: 100,
          include_metadata: true,
        };
        break;
        
      case "high_confidence":
        params = {
          start_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date().toISOString(),
          confidence_min: 0.8,
          magnitude_min: 0.4,
          sort_by: "confidence",
          sort_order: "desc",
          limit: 100,
          include_metadata: true,
        };
        break;
        
      case "weekly_summary":
        params = {
          start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date().toISOString(),
          magnitude_min: 0.6,
          confidence_min: 0.5,
          sort_by: "magnitude",
          sort_order: "desc",
          limit: 200,
          include_metadata: true,
        };
        break;
    }
    
    const queryString = buildQueryString(params);
    
    return {
      params,
      queryString,
      intent: args.intent,
    };
  },
});

/**
 * Validate API parameters
 */
export function validateApiParams(params: FetchEmbeddingsParams): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate date range
  if (params.start_date && params.end_date) {
    const start = new Date(params.start_date);
    const end = new Date(params.end_date);
    
    if (start > end) {
      errors.push("Start date must be before end date");
    }
    
    const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) {
      warnings.push("Date range exceeds 1 year, results may be limited");
    }
  }
  
  // Validate confidence range
  if (params.confidence_min !== undefined && params.confidence_max !== undefined) {
    if (params.confidence_min > params.confidence_max) {
      errors.push("Confidence min cannot exceed max");
    }
  }
  
  if (params.confidence_min !== undefined) {
    if (params.confidence_min < 0 || params.confidence_min > 1) {
      errors.push("Confidence min must be between 0 and 1");
    }
  }
  
  if (params.confidence_max !== undefined) {
    if (params.confidence_max < 0 || params.confidence_max > 1) {
      errors.push("Confidence max must be between 0 and 1");
    }
  }
  
  // Validate magnitude range
  if (params.magnitude_min !== undefined && params.magnitude_max !== undefined) {
    if (params.magnitude_min > params.magnitude_max) {
      errors.push("Magnitude min cannot exceed max");
    }
  }
  
  if (params.magnitude_min !== undefined) {
    if (params.magnitude_min < 0 || params.magnitude_min > 1) {
      errors.push("Magnitude min must be between 0 and 1");
    }
  }
  
  if (params.magnitude_max !== undefined) {
    if (params.magnitude_max < 0 || params.magnitude_max > 1) {
      errors.push("Magnitude max must be between 0 and 1");
    }
  }
  
  // Validate limit
  if (params.limit !== undefined) {
    if (params.limit <= 0) {
      errors.push("Limit must be greater than 0");
    }
    if (params.limit > 1000) {
      warnings.push("Limit exceeds 1000, may be capped by API");
    }
  }
  
  // Validate domains
  if (params.domains) {
    const validDomains = ["port", "farm", "mine", "energy"];
    const invalidDomains = params.domains.filter(d => !validDomains.includes(d));
    if (invalidDomains.length > 0) {
      errors.push(`Invalid domains: ${invalidDomains.join(", ")}`);
    }
  }
  
  // Validate sort_by
  if (params.sort_by) {
    const validSortFields = ["timestamp", "magnitude", "confidence", "severity", "relevance"];
    if (!validSortFields.includes(params.sort_by)) {
      errors.push(`Invalid sort_by field: ${params.sort_by}`);
    }
  }
  
  // Validate sort_order
  if (params.sort_order) {
    if (params.sort_order !== "asc" && params.sort_order !== "desc") {
      errors.push("Sort order must be 'asc' or 'desc'");
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Action to validate API parameters
 */
export const validateParams = action({
  args: {
    params: v.any(),
  },
  handler: async (ctx, args) => {
    const params = args.params as FetchEmbeddingsParams;
    return validateApiParams(params);
  },
});

/**
 * Export utilities
 */
export default {
  convertToApiParams,
  buildQueryString,
  validateApiParams,
  REGION_TO_COUNTRIES,
};
