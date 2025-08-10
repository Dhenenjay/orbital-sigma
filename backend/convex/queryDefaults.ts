/**
 * Query Defaults Configuration
 * Defines default values for anomaly query parameters
 */

import { v } from "convex/values";
import { query, action } from "./_generated/server";

/**
 * Default query parameters
 */
export const QUERY_DEFAULTS = {
  // Domain defaults to "all" - search across all domains
  domain: "all" as const,
  domains: ["port", "farm", "mine", "energy"] as const,
  
  // Time window defaults to 14 days (2 weeks)
  timeWindow: {
    days: 14,
    label: "Last 14 days",
    startDate: () => {
      const date = new Date();
      date.setDate(date.getDate() - 14);
      return date;
    },
    endDate: () => new Date(),
  },
  
  // Magnitude threshold defaults to 0.5 (moderate changes)
  magnitude: {
    threshold: 0.5,
    min: 0.5,
    max: 1.0,
    label: "Moderate and above (≥50%)",
    description: "Shows moderate, significant, large, and extreme changes",
  },
  
  // Severity defaults
  severity: {
    min: "low" as const,
    levels: ["low", "medium", "high", "critical"] as const,
    includeAll: true,
  },
  
  // Confidence defaults
  confidence: {
    min: 0.5,
    threshold: 0.5,
    label: "Medium confidence and above (≥50%)",
  },
  
  // Sorting defaults
  sorting: {
    by: "timestamp" as const,
    order: "desc" as const,
    label: "Most recent first",
  },
  
  // Pagination defaults
  pagination: {
    limit: 100,
    offset: 0,
    maxLimit: 1000,
  },
  
  // Region defaults
  region: {
    type: "global" as const,
    includeAll: true,
  },
  
  // Areas of Interest defaults
  aoi: {
    includeAll: true,
    matchedOnly: false,
  },
} as const;

/**
 * Query parameter types with defaults
 */
export interface QueryParameters {
  // Core parameters
  domains?: string[];
  timeWindow?: {
    startDate: Date;
    endDate: Date;
    days?: number;
  };
  magnitude?: {
    min?: number;
    max?: number;
    threshold?: number;
  };
  
  // Filter parameters
  severity?: {
    min?: string;
    levels?: string[];
  };
  confidence?: {
    min?: number;
    threshold?: number;
  };
  regions?: string[];
  aois?: string[];
  
  // Display parameters
  sorting?: {
    by?: string;
    order?: "asc" | "desc";
  };
  limit?: number;
  offset?: number;
  
  // Market parameters
  marketIntent?: boolean;
  commodities?: string[];
  
  // Additional context
  includeContext?: boolean;
  includeMetrics?: boolean;
}

/**
 * Apply defaults to partial query parameters
 */
export function applyQueryDefaults(params: Partial<QueryParameters>): QueryParameters {
  const now = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - QUERY_DEFAULTS.timeWindow.days);
  
  return {
    // Apply domain defaults
    domains: params.domains || QUERY_DEFAULTS.domains.slice(),
    
    // Apply time window defaults
    timeWindow: params.timeWindow || {
      startDate: defaultStart,
      endDate: now,
      days: QUERY_DEFAULTS.timeWindow.days,
    },
    
    // Apply magnitude defaults
    magnitude: {
      min: params.magnitude?.min ?? QUERY_DEFAULTS.magnitude.min,
      max: params.magnitude?.max ?? QUERY_DEFAULTS.magnitude.max,
      threshold: params.magnitude?.threshold ?? QUERY_DEFAULTS.magnitude.threshold,
    },
    
    // Apply severity defaults
    severity: params.severity || {
      min: QUERY_DEFAULTS.severity.min,
      levels: QUERY_DEFAULTS.severity.levels.slice(),
    },
    
    // Apply confidence defaults
    confidence: {
      min: params.confidence?.min ?? QUERY_DEFAULTS.confidence.min,
      threshold: params.confidence?.threshold ?? QUERY_DEFAULTS.confidence.threshold,
    },
    
    // Apply region defaults (all regions if not specified)
    regions: params.regions || [],
    
    // Apply AOI defaults (all AOIs if not specified)
    aois: params.aois || [],
    
    // Apply sorting defaults
    sorting: {
      by: params.sorting?.by || QUERY_DEFAULTS.sorting.by,
      order: params.sorting?.order || QUERY_DEFAULTS.sorting.order,
    },
    
    // Apply pagination defaults
    limit: params.limit ?? QUERY_DEFAULTS.pagination.limit,
    offset: params.offset ?? QUERY_DEFAULTS.pagination.offset,
    
    // Apply market defaults
    marketIntent: params.marketIntent ?? false,
    commodities: params.commodities || [],
    
    // Apply context defaults
    includeContext: params.includeContext ?? true,
    includeMetrics: params.includeMetrics ?? true,
  };
}

/**
 * Get default query string representation
 */
export function getDefaultQueryString(): string {
  return `Show all anomalies from the last ${QUERY_DEFAULTS.timeWindow.days} days with magnitude ≥${QUERY_DEFAULTS.magnitude.threshold * 100}%`;
}

/**
 * Preset query configurations
 */
export const QUERY_PRESETS = {
  // Default: Balanced view
  default: {
    name: "Default View",
    description: "Last 14 days, moderate changes and above",
    params: applyQueryDefaults({}),
  },
  
  // Recent critical
  recentCritical: {
    name: "Recent Critical",
    description: "Last 24 hours, high severity only",
    params: applyQueryDefaults({
      timeWindow: {
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date(),
        days: 1,
      },
      severity: {
        min: "high",
        levels: ["high", "critical"],
      },
      magnitude: {
        min: 0.7,
        max: 1.0,
        threshold: 0.7,
      },
    }),
  },
  
  // Weekly overview
  weeklyOverview: {
    name: "Weekly Overview",
    description: "Last 7 days, all significant changes",
    params: applyQueryDefaults({
      timeWindow: {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        days: 7,
      },
      magnitude: {
        min: 0.6,
        max: 1.0,
        threshold: 0.6,
      },
    }),
  },
  
  // Monthly trends
  monthlyTrends: {
    name: "Monthly Trends",
    description: "Last 30 days, all changes",
    params: applyQueryDefaults({
      timeWindow: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        days: 30,
      },
      magnitude: {
        min: 0.3,
        max: 1.0,
        threshold: 0.3,
      },
    }),
  },
  
  // High confidence only
  highConfidence: {
    name: "High Confidence",
    description: "Last 14 days, high confidence detections only",
    params: applyQueryDefaults({
      confidence: {
        min: 0.8,
        threshold: 0.8,
      },
    }),
  },
  
  // Market focus
  marketFocus: {
    name: "Market Impact",
    description: "Last 14 days, market-relevant anomalies",
    params: applyQueryDefaults({
      marketIntent: true,
      magnitude: {
        min: 0.6,
        max: 1.0,
        threshold: 0.6,
      },
    }),
  },
  
  // Domain-specific presets
  portFocus: {
    name: "Port Activity",
    description: "Last 14 days, port domain only",
    params: applyQueryDefaults({
      domains: ["port"],
    }),
  },
  
  farmFocus: {
    name: "Agricultural Activity",
    description: "Last 14 days, farm domain only",
    params: applyQueryDefaults({
      domains: ["farm"],
    }),
  },
  
  mineFocus: {
    name: "Mining Activity",
    description: "Last 14 days, mine domain only",
    params: applyQueryDefaults({
      domains: ["mine"],
    }),
  },
  
  energyFocus: {
    name: "Energy Activity",
    description: "Last 14 days, energy domain only",
    params: applyQueryDefaults({
      domains: ["energy"],
    }),
  },
};

/**
 * Validate query parameters against defaults and limits
 */
export function validateQueryParameters(params: QueryParameters): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate time window
  if (params.timeWindow) {
    const days = Math.ceil(
      (params.timeWindow.endDate.getTime() - params.timeWindow.startDate.getTime()) / 
      (1000 * 60 * 60 * 24)
    );
    
    if (days < 0) {
      errors.push("End date must be after start date");
    }
    
    if (days > 365) {
      warnings.push("Time window exceeds 1 year, results may be limited");
    }
    
    if (days > 90) {
      warnings.push("Large time window may affect performance");
    }
  }
  
  // Validate magnitude
  if (params.magnitude) {
    if (params.magnitude.min !== undefined) {
      if (params.magnitude.min < 0 || params.magnitude.min > 1) {
        errors.push("Magnitude minimum must be between 0 and 1");
      }
    }
    
    if (params.magnitude.max !== undefined) {
      if (params.magnitude.max < 0 || params.magnitude.max > 1) {
        errors.push("Magnitude maximum must be between 0 and 1");
      }
    }
    
    if (params.magnitude.min !== undefined && params.magnitude.max !== undefined) {
      if (params.magnitude.min > params.magnitude.max) {
        errors.push("Magnitude minimum cannot exceed maximum");
      }
    }
  }
  
  // Validate confidence
  if (params.confidence) {
    if (params.confidence.threshold !== undefined) {
      if (params.confidence.threshold < 0 || params.confidence.threshold > 1) {
        errors.push("Confidence threshold must be between 0 and 1");
      }
    }
  }
  
  // Validate pagination
  if (params.limit !== undefined) {
    if (params.limit <= 0) {
      errors.push("Limit must be greater than 0");
    }
    
    if (params.limit > QUERY_DEFAULTS.pagination.maxLimit) {
      warnings.push(`Limit exceeds maximum of ${QUERY_DEFAULTS.pagination.maxLimit}`);
    }
  }
  
  // Validate domains
  if (params.domains && params.domains.length === 0) {
    warnings.push("No domains selected, defaulting to all");
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get user-friendly description of query parameters
 */
export function describeQueryParameters(params: QueryParameters): string {
  const parts: string[] = [];
  
  // Describe domains
  if (params.domains && params.domains.length > 0) {
    if (params.domains.length === 4) {
      parts.push("all domains");
    } else {
      parts.push(`${params.domains.join(", ")} domain${params.domains.length > 1 ? "s" : ""}`);
    }
  }
  
  // Describe time window
  if (params.timeWindow?.days) {
    parts.push(`last ${params.timeWindow.days} day${params.timeWindow.days > 1 ? "s" : ""}`);
  }
  
  // Describe magnitude
  if (params.magnitude?.threshold) {
    const percent = Math.round(params.magnitude.threshold * 100);
    parts.push(`magnitude ≥${percent}%`);
  }
  
  // Describe severity
  if (params.severity?.min && params.severity.min !== "low") {
    parts.push(`${params.severity.min} severity and above`);
  }
  
  // Describe confidence
  if (params.confidence?.threshold && params.confidence.threshold > 0.5) {
    const percent = Math.round(params.confidence.threshold * 100);
    parts.push(`confidence ≥${percent}%`);
  }
  
  // Describe regions
  if (params.regions && params.regions.length > 0) {
    parts.push(`in ${params.regions.join(", ")}`);
  }
  
  // Describe market intent
  if (params.marketIntent) {
    parts.push("with market impact");
  }
  
  return parts.length > 0 
    ? `Showing anomalies for ${parts.join(", ")}`
    : "Showing all anomalies with default filters";
}

/**
 * Convex action to get default parameters
 */
export const getDefaultParameters = action({
  args: {
    preset: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.preset && args.preset in QUERY_PRESETS) {
      const preset = QUERY_PRESETS[args.preset as keyof typeof QUERY_PRESETS];
      return {
        ...preset.params,
        presetName: preset.name,
        presetDescription: preset.description,
      };
    }
    
    return applyQueryDefaults({});
  },
});

/**
 * Query to get available presets
 */
export const getQueryPresets = query({
  args: {},
  handler: async (ctx) => {
    return Object.entries(QUERY_PRESETS).map(([key, preset]) => ({
      key,
      name: preset.name,
      description: preset.description,
      isDefault: key === "default",
    }));
  },
});

/**
 * Action to validate parameters
 */
export const validateParameters = action({
  args: {
    params: v.object({
      domains: v.optional(v.array(v.string())),
      days: v.optional(v.number()),
      magnitudeThreshold: v.optional(v.number()),
      confidenceThreshold: v.optional(v.number()),
      limit: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const params = applyQueryDefaults({
      domains: args.params.domains,
      timeWindow: args.params.days ? {
        startDate: new Date(Date.now() - args.params.days * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        days: args.params.days,
      } : undefined,
      magnitude: args.params.magnitudeThreshold ? {
        threshold: args.params.magnitudeThreshold,
        min: args.params.magnitudeThreshold,
        max: 1.0,
      } : undefined,
      confidence: args.params.confidenceThreshold ? {
        threshold: args.params.confidenceThreshold,
        min: args.params.confidenceThreshold,
      } : undefined,
      limit: args.params.limit,
    });
    
    const validation = validateQueryParameters(params);
    const description = describeQueryParameters(params);
    
    return {
      params,
      validation,
      description,
    };
  },
});

/**
 * Export all defaults utilities
 */
export default {
  QUERY_DEFAULTS,
  QUERY_PRESETS,
  applyQueryDefaults,
  validateQueryParameters,
  describeQueryParameters,
  getDefaultQueryString,
};
