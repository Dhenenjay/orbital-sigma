/**
 * Time Mapping System
 * Converts natural language time expressions to days and date ranges
 */

import { v } from "convex/values";
import { query, action } from "./_generated/server";

/**
 * Time unit in days
 */
export const TIME_UNITS = {
  day: 1,
  week: 7,
  fortnight: 14,
  month: 30,
  quarter: 90,
  year: 365,
  decade: 3650,
} as const;

/**
 * Common time expression mappings
 */
export const TIME_EXPRESSIONS: Record<string, number> = {
  // Days
  "today": 0,
  "yesterday": 1,
  "day before yesterday": 2,
  "this week": 7,
  "last week": 7,
  "past week": 7,
  "previous week": 7,
  "week ago": 7,
  
  // Two weeks
  "last fortnight": 14,
  "past fortnight": 14,
  "last two weeks": 14,
  "past two weeks": 14,
  "previous two weeks": 14,
  "two weeks ago": 14,
  
  // Months
  "this month": 30,
  "last month": 30,
  "past month": 30,
  "previous month": 30,
  "month ago": 30,
  "last 30 days": 30,
  "past 30 days": 30,
  
  // Multiple months
  "last two months": 60,
  "past two months": 60,
  "last 60 days": 60,
  "past 60 days": 60,
  "last three months": 90,
  "past three months": 90,
  "last 90 days": 90,
  "past 90 days": 90,
  "last quarter": 90,
  "past quarter": 90,
  "previous quarter": 90,
  
  // Half year
  "last six months": 180,
  "past six months": 180,
  "last 6 months": 180,
  "past 6 months": 180,
  "last half year": 180,
  "past half year": 180,
  "last 180 days": 180,
  
  // Year
  "this year": 365,
  "last year": 365,
  "past year": 365,
  "previous year": 365,
  "year ago": 365,
  "last 12 months": 365,
  "past 12 months": 365,
  "last 365 days": 365,
  
  // Multiple years
  "last two years": 730,
  "past two years": 730,
  "last 2 years": 730,
  "last three years": 1095,
  "past three years": 1095,
  "last 3 years": 1095,
  "last five years": 1825,
  "past five years": 1825,
  "last 5 years": 1825,
  "last decade": 3650,
  "past decade": 3650,
};

/**
 * Relative time indicators
 */
export const RELATIVE_INDICATORS = {
  past: ["last", "past", "previous", "prior", "recent", "ago"],
  future: ["next", "upcoming", "following", "coming", "future"],
  current: ["this", "current", "present", "today", "now"],
} as const;

/**
 * Season mappings (approximate)
 */
export const SEASON_DAYS: Record<string, number> = {
  "spring": 90,
  "summer": 90,
  "fall": 90,
  "autumn": 90,
  "winter": 90,
  "last spring": 90,
  "last summer": 90,
  "last fall": 90,
  "last autumn": 90,
  "last winter": 90,
};

/**
 * Business/Trading period mappings
 */
export const BUSINESS_PERIODS: Record<string, number> = {
  "trading week": 5,
  "business week": 5,
  "trading month": 22,
  "business month": 22,
  "fiscal quarter": 90,
  "q1": 90,
  "q2": 90,
  "q3": 90,
  "q4": 90,
  "h1": 180,
  "h2": 180,
  "first half": 180,
  "second half": 180,
  "fiscal year": 365,
  "fy": 365,
};

/**
 * Parse a numeric time expression (e.g., "3 days", "2 weeks")
 */
export function parseNumericTimeExpression(text: string): number | null {
  const normalizedText = text.toLowerCase().trim();
  
  // Regular expression to match numeric patterns
  const patterns = [
    // "3 days", "three days"
    /(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*(day|days|week|weeks|month|months|year|years|fortnight|fortnights|quarter|quarters|decade|decades)/i,
    // "3-day", "30-day"
    /(\d+)[-\s]?(day|week|month|year)/i,
  ];
  
  // Number word to digit mapping
  const numberWords: Record<string, number> = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "twenty": 20, "thirty": 30,
    "forty": 40, "fifty": 50, "sixty": 60, "ninety": 90,
    "hundred": 100,
  };
  
  for (const pattern of patterns) {
    const match = normalizedText.match(pattern);
    if (match) {
      const numberPart = match[1].toLowerCase();
      const unitPart = match[2].toLowerCase();
      
      // Get numeric value
      let value = parseInt(numberPart);
      if (isNaN(value)) {
        value = numberWords[numberPart] || 0;
      }
      
      if (value === 0) continue;
      
      // Get unit multiplier
      let multiplier = 1;
      if (unitPart.includes("day")) multiplier = TIME_UNITS.day;
      else if (unitPart.includes("week")) multiplier = TIME_UNITS.week;
      else if (unitPart.includes("fortnight")) multiplier = TIME_UNITS.fortnight;
      else if (unitPart.includes("month")) multiplier = TIME_UNITS.month;
      else if (unitPart.includes("quarter")) multiplier = TIME_UNITS.quarter;
      else if (unitPart.includes("year")) multiplier = TIME_UNITS.year;
      else if (unitPart.includes("decade")) multiplier = TIME_UNITS.decade;
      
      return value * multiplier;
    }
  }
  
  return null;
}

/**
 * Map time expression to days
 */
export function mapTimeToDays(expression: string): {
  days: number;
  confidence: number;
  type: "exact" | "approximate" | "parsed";
} | null {
  const normalized = expression.toLowerCase().trim();
  
  // Check exact matches first
  if (TIME_EXPRESSIONS[normalized]) {
    return {
      days: TIME_EXPRESSIONS[normalized],
      confidence: 1.0,
      type: "exact"
    };
  }
  
  // Check season mappings
  if (SEASON_DAYS[normalized]) {
    return {
      days: SEASON_DAYS[normalized],
      confidence: 0.8,
      type: "approximate"
    };
  }
  
  // Check business periods
  if (BUSINESS_PERIODS[normalized]) {
    return {
      days: BUSINESS_PERIODS[normalized],
      confidence: 0.9,
      type: "exact"
    };
  }
  
  // Try to parse numeric expressions
  const numericDays = parseNumericTimeExpression(normalized);
  if (numericDays !== null) {
    return {
      days: numericDays,
      confidence: 0.95,
      type: "parsed"
    };
  }
  
  // Try partial matches for common patterns
  const partialPatterns: Array<[RegExp, number, number]> = [
    [/past\s+(\d+)\s+days?/i, 1, 1.0],
    [/last\s+(\d+)\s+days?/i, 1, 1.0],
    [/past\s+(\d+)\s+weeks?/i, 7, 0.95],
    [/last\s+(\d+)\s+weeks?/i, 7, 0.95],
    [/past\s+(\d+)\s+months?/i, 30, 0.9],
    [/last\s+(\d+)\s+months?/i, 30, 0.9],
    [/past\s+(\d+)\s+years?/i, 365, 0.9],
    [/last\s+(\d+)\s+years?/i, 365, 0.9],
  ];
  
  for (const [pattern, multiplier, confidence] of partialPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const value = parseInt(match[1]);
      if (!isNaN(value)) {
        return {
          days: value * multiplier,
          confidence,
          type: "parsed"
        };
      }
    }
  }
  
  return null;
}

/**
 * Convert days to a date range from today
 */
export function daysToDateRange(days: number, fromDate?: Date): {
  start: Date;
  end: Date;
} {
  const endDate = fromDate || new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);
  
  return {
    start: startDate,
    end: endDate
  };
}

/**
 * Parse multiple time expressions from text
 */
export function extractTimeExpressions(text: string): Array<{
  expression: string;
  days: number;
  confidence: number;
  position: number;
}> {
  const results: Array<{
    expression: string;
    days: number;
    confidence: number;
    position: number;
  }> = [];
  
  const normalizedText = text.toLowerCase();
  
  // Check all known expressions
  for (const [expression, days] of Object.entries(TIME_EXPRESSIONS)) {
    const position = normalizedText.indexOf(expression);
    if (position !== -1) {
      results.push({
        expression,
        days,
        confidence: 1.0,
        position
      });
    }
  }
  
  // Check numeric patterns
  const numericPattern = /(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*(days?|weeks?|months?|years?)/gi;
  let match;
  while ((match = numericPattern.exec(normalizedText)) !== null) {
    const parsed = parseNumericTimeExpression(match[0]);
    if (parsed !== null) {
      // Check if this overlaps with an existing result
      const overlaps = results.some(r => 
        (match.index >= r.position && match.index < r.position + r.expression.length) ||
        (r.position >= match.index && r.position < match.index + match[0].length)
      );
      
      if (!overlaps) {
        results.push({
          expression: match[0],
          days: parsed,
          confidence: 0.95,
          position: match.index
        });
      }
    }
  }
  
  // Sort by position in text
  results.sort((a, b) => a.position - b.position);
  
  return results;
}

/**
 * Intelligent time range detection
 */
export function detectTimeRange(text: string): {
  primary: { days: number; confidence: number } | null;
  all: Array<{ days: number; confidence: number; expression: string }>;
  hasMultiple: boolean;
  suggestion: string | null;
} {
  const expressions = extractTimeExpressions(text);
  
  if (expressions.length === 0) {
    return {
      primary: null,
      all: [],
      hasMultiple: false,
      suggestion: null
    };
  }
  
  // Find the most confident/relevant expression
  const primary = expressions.reduce((best, current) => 
    current.confidence > best.confidence ? current : best
  );
  
  const all = expressions.map(e => ({
    days: e.days,
    confidence: e.confidence,
    expression: e.expression
  }));
  
  // Generate suggestion if ambiguous
  let suggestion = null;
  if (expressions.length > 1) {
    const dayValues = [...new Set(expressions.map(e => e.days))];
    if (dayValues.length > 1) {
      suggestion = `Multiple time periods detected: ${dayValues.map(d => `${d} days`).join(', ')}. Using ${primary.days} days.`;
    }
  }
  
  return {
    primary: { days: primary.days, confidence: primary.confidence },
    all,
    hasMultiple: expressions.length > 1,
    suggestion
  };
}

/**
 * Format days to human-readable string
 */
export function formatDaysToString(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "1 day";
  if (days === 7) return "1 week";
  if (days === 14) return "2 weeks";
  if (days === 30) return "1 month";
  if (days === 60) return "2 months";
  if (days === 90) return "3 months";
  if (days === 180) return "6 months";
  if (days === 365) return "1 year";
  if (days === 730) return "2 years";
  
  // For other values, provide the most readable format
  if (days < 7) return `${days} days`;
  if (days < 30) {
    const weeks = Math.round(days / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''}`;
  }
  if (days < 365) {
    const months = Math.round(days / 30);
    return `${months} month${months > 1 ? 's' : ''}`;
  }
  
  const years = Math.round(days / 365);
  return `${years} year${years > 1 ? 's' : ''}`;
}

/**
 * Get time context (past, present, future)
 */
export function getTimeContext(text: string): "past" | "present" | "future" | "unknown" {
  const normalized = text.toLowerCase();
  
  for (const indicator of RELATIVE_INDICATORS.past) {
    if (normalized.includes(indicator)) return "past";
  }
  
  for (const indicator of RELATIVE_INDICATORS.future) {
    if (normalized.includes(indicator)) return "future";
  }
  
  for (const indicator of RELATIVE_INDICATORS.current) {
    if (normalized.includes(indicator)) return "present";
  }
  
  return "unknown";
}

/**
 * Parse date-specific expressions
 */
export function parseDateExpression(text: string): Date | null {
  const normalized = text.toLowerCase().trim();
  
  // Handle "since" expressions
  if (normalized.startsWith("since ")) {
    const sinceText = normalized.replace("since ", "");
    
    // Handle month names
    const months = [
      "january", "february", "march", "april", "may", "june",
      "july", "august", "september", "october", "november", "december"
    ];
    
    for (let i = 0; i < months.length; i++) {
      if (sinceText.includes(months[i])) {
        const now = new Date();
        const year = sinceText.match(/\d{4}/) ? 
          parseInt(sinceText.match(/\d{4}/)![0]) : 
          now.getFullYear();
        
        return new Date(year, i, 1);
      }
    }
    
    // Handle year
    const yearMatch = sinceText.match(/^(\d{4})$/);
    if (yearMatch) {
      return new Date(parseInt(yearMatch[1]), 0, 1);
    }
  }
  
  // Handle "from X to Y" patterns
  const rangeMatch = normalized.match(/from\s+(.+?)\s+to\s+(.+)/);
  if (rangeMatch) {
    // This would need more sophisticated date parsing
    // For now, return null and let the caller handle it
    return null;
  }
  
  return null;
}

/**
 * Convex action to map time expressions
 */
export const mapTimeExpression = action({
  args: {
    text: v.string(),
    includeRange: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const result = mapTimeToDays(args.text);
    
    if (!result) {
      // Try to detect from larger text
      const detection = detectTimeRange(args.text);
      if (detection.primary) {
        const range = args.includeRange ? 
          daysToDateRange(detection.primary.days) : 
          undefined;
        
        return {
          days: detection.primary.days,
          confidence: detection.primary.confidence,
          type: "detected" as const,
          range,
          suggestion: detection.suggestion
        };
      }
      
      return null;
    }
    
    const range = args.includeRange ? 
      daysToDateRange(result.days) : 
      undefined;
    
    return {
      ...result,
      range
    };
  },
});

/**
 * Query to get all time mappings
 */
export const getTimeMappings = query({
  args: {
    category: v.optional(v.union(
      v.literal("days"),
      v.literal("weeks"),
      v.literal("months"),
      v.literal("years"),
      v.literal("business"),
      v.literal("seasons")
    )),
  },
  handler: async (ctx, args) => {
    if (!args.category) {
      return {
        expressions: TIME_EXPRESSIONS,
        seasons: SEASON_DAYS,
        business: BUSINESS_PERIODS
      };
    }
    
    switch (args.category) {
      case "days":
        return Object.entries(TIME_EXPRESSIONS)
          .filter(([_, days]) => days <= 7)
          .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});
      
      case "weeks":
        return Object.entries(TIME_EXPRESSIONS)
          .filter(([_, days]) => days > 7 && days <= 30)
          .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});
      
      case "months":
        return Object.entries(TIME_EXPRESSIONS)
          .filter(([_, days]) => days > 30 && days <= 365)
          .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});
      
      case "years":
        return Object.entries(TIME_EXPRESSIONS)
          .filter(([_, days]) => days > 365)
          .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});
      
      case "business":
        return BUSINESS_PERIODS;
      
      case "seasons":
        return SEASON_DAYS;
      
      default:
        return {};
    }
  },
});

/**
 * Action to extract all time expressions from text
 */
export const extractAllTimeExpressions = action({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    return extractTimeExpressions(args.text);
  },
});

/**
 * Helper to validate if a time range is reasonable
 */
export function isReasonableTimeRange(days: number, context?: string): {
  valid: boolean;
  reason?: string;
} {
  // Maximum reasonable lookback
  const MAX_DAYS = 3650; // 10 years
  
  if (days < 0) {
    return { valid: false, reason: "Time range cannot be negative" };
  }
  
  if (days > MAX_DAYS) {
    return { valid: false, reason: `Time range exceeds maximum of ${MAX_DAYS} days (10 years)` };
  }
  
  // Context-specific validation
  if (context) {
    const contextLower = context.toLowerCase();
    
    // For real-time or urgent contexts, warn about long ranges
    if (contextLower.includes("urgent") || contextLower.includes("immediate")) {
      if (days > 7) {
        return { 
          valid: true, 
          reason: "Long time range specified for urgent query" 
        };
      }
    }
    
    // For historical analysis, short ranges might be insufficient
    if (contextLower.includes("historical") || contextLower.includes("trend")) {
      if (days < 30) {
        return { 
          valid: true, 
          reason: "Short time range might be insufficient for historical analysis" 
        };
      }
    }
  }
  
  return { valid: true };
}

/**
 * Common time presets for UI
 */
export const TIME_PRESETS = [
  { label: "Today", days: 0 },
  { label: "Last 24 hours", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 14 days", days: 14 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 6 months", days: 180 },
  { label: "Last year", days: 365 },
  { label: "Last 2 years", days: 730 },
  { label: "Last 5 years", days: 1825 },
];

/**
 * Export all time-related utilities
 */
export default {
  mapTimeToDays,
  daysToDateRange,
  extractTimeExpressions,
  detectTimeRange,
  formatDaysToString,
  getTimeContext,
  parseDateExpression,
  parseNumericTimeExpression,
  isReasonableTimeRange,
  TIME_UNITS,
  TIME_EXPRESSIONS,
  TIME_PRESETS,
  SEASON_DAYS,
  BUSINESS_PERIODS,
};
