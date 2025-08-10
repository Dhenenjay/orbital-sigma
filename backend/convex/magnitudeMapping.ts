/**
 * Magnitude/Size Mapping System
 * Converts qualitative size descriptions to numerical values (0-1 scale)
 */

import { v } from "convex/values";
import { query, action } from "./_generated/server";

/**
 * Magnitude levels with their numerical ranges
 */
export const MAGNITUDE_LEVELS = {
  none: { min: 0, max: 0.1, typical: 0 },
  minimal: { min: 0.1, max: 0.2, typical: 0.15 },
  small: { min: 0.2, max: 0.4, typical: 0.3 },
  moderate: { min: 0.4, max: 0.6, typical: 0.5 },
  significant: { min: 0.6, max: 0.8, typical: 0.7 },
  large: { min: 0.7, max: 0.9, typical: 0.8 },
  extreme: { min: 0.9, max: 1.0, typical: 0.95 },
} as const;

/**
 * Size descriptors mapped to magnitude values
 */
export const SIZE_DESCRIPTORS: Record<string, number> = {
  // Minimal/Tiny (0.1-0.2)
  "tiny": 0.15,
  "minimal": 0.15,
  "minuscule": 0.1,
  "microscopic": 0.1,
  "negligible": 0.15,
  "trivial": 0.15,
  "insignificant": 0.15,
  "barely noticeable": 0.15,
  "hardly any": 0.15,
  
  // Small (0.2-0.4)
  "small": 0.3,
  "little": 0.3,
  "minor": 0.25,
  "slight": 0.25,
  "modest": 0.35,
  "limited": 0.3,
  "marginal": 0.25,
  "low": 0.3,
  "weak": 0.25,
  "mild": 0.25,
  "subtle": 0.25,
  "gentle": 0.25,
  
  // Medium/Moderate (0.4-0.6)
  "medium": 0.5,
  "moderate": 0.5,
  "average": 0.5,
  "normal": 0.5,
  "typical": 0.5,
  "standard": 0.5,
  "reasonable": 0.5,
  "fair": 0.45,
  "intermediate": 0.5,
  "middle": 0.5,
  "neutral": 0.5,
  
  // Significant/Notable (0.6-0.7)
  "significant": 0.7,
  "notable": 0.65,
  "considerable": 0.65,
  "substantial": 0.7,
  "meaningful": 0.65,
  "important": 0.65,
  "marked": 0.65,
  "pronounced": 0.7,
  "noticeable": 0.6,
  "appreciable": 0.65,
  
  // Large/Big (0.7-0.9)
  "large": 0.8,
  "big": 0.75,
  "major": 0.8,
  "strong": 0.75,
  "high": 0.75,
  "great": 0.8,
  "very-considerable": 0.75,
  "extensive": 0.8,
  "broad": 0.75,
  "wide": 0.75,
  "heavy": 0.8,
  "intense": 0.8,
  "severe": 0.85,
  "serious": 0.8,
  
  // Extreme/Massive (0.9-1.0)
  "extreme": 0.95,
  "massive": 0.9,
  "huge": 0.9,
  "enormous": 0.95,
  "immense": 0.95,
  "vast": 0.9,
  "gigantic": 0.95,
  "colossal": 0.95,
  "tremendous": 0.9,
  "extraordinary": 0.9,
  "exceptional": 0.9,
  "unprecedented": 0.95,
  "dramatic": 0.85,
  "drastic": 0.9,
  "radical": 0.9,
  "complete": 1.0,
  "total": 1.0,
  "absolute": 1.0,
  "maximum": 1.0,
  "full": 1.0,
};

/**
 * Context-specific magnitude terms for different types of changes
 */
export const CHANGE_MAGNITUDES: Record<string, number> = {
  // Changes/Shifts
  "tiny change": 0.15,
  "small change": 0.3,
  "small shift": 0.3,
  "minor change": 0.25,
  "slight change": 0.25,
  "moderate change": 0.5,
  "significant change": 0.7,
  "big change": 0.75,
  "large change": 0.8,
  "major change": 0.8,
  "massive change": 0.9,
  "huge change": 0.9,
  "dramatic change": 0.85,
  "drastic change": 0.9,
  "radical change": 0.9,
  
  // Movements
  "slight movement": 0.25,
  "small movement": 0.3,
  "moderate movement": 0.5,
  "significant movement": 0.7,
  "large movement": 0.8,
  "major movement": 0.8,
  
  // Variations
  "minor variation": 0.25,
  "small variation": 0.3,
  "moderate variation": 0.5,
  "significant variation": 0.7,
  "large variation": 0.8,
  "extreme variation": 0.95,
  
  // Deviations
  "slight deviation": 0.25,
  "small deviation": 0.3,
  "moderate deviation": 0.5,
  "significant deviation": 0.7,
  "large deviation": 0.8,
  "major deviation": 0.8,
  "extreme deviation": 0.95,
  
  // Anomalies
  "minor anomaly": 0.25,
  "small anomaly": 0.3,
  "moderate anomaly": 0.5,
  "significant anomaly": 0.7,
  "major anomaly": 0.8,
  "severe anomaly": 0.85,
  "critical anomaly": 0.9,
  "extreme anomaly": 0.95,
};

/**
 * Percentage-based magnitudes
 */
export const PERCENTAGE_MAGNITUDES: Record<string, number> = {
  "1%": 0.01,
  "5%": 0.05,
  "10%": 0.1,
  "20%": 0.2,
  "25%": 0.25,
  "30%": 0.3,
  "40%": 0.4,
  "50%": 0.5,
  "60%": 0.6,
  "70%": 0.7,
  "75%": 0.75,
  "80%": 0.8,
  "90%": 0.9,
  "95%": 0.95,
  "99%": 0.99,
  "100%": 1.0,
};

/**
 * Multiplier words that modify magnitude
 */
export const MAGNITUDE_MODIFIERS = {
  amplifiers: {
    "very": 1.3,
    "extremely": 1.5,
    "incredibly": 1.5,
    "remarkably": 1.4,
    "exceptionally": 1.5,
    "particularly": 1.3,
    "especially": 1.3,
    "unusually": 1.4,
    "abnormally": 1.4,
    "super": 1.4,
    "ultra": 1.5,
    "mega": 1.5,
  },
  diminishers: {
    "somewhat": 0.7,
    "slightly": 0.6,
    "a bit": 0.7,
    "a little": 0.7,
    "fairly": 0.8,
    "relatively": 0.8,
    "rather": 0.8,
    "quite": 0.9,
    "barely": 0.5,
    "hardly": 0.5,
    "scarcely": 0.5,
  },
} as const;

/**
 * Domain-specific magnitude terms
 */
export const DOMAIN_SPECIFIC_MAGNITUDES = {
  // Port/Shipping
  port: {
    "minor delay": 0.25,
    "moderate congestion": 0.5,
    "significant backlog": 0.7,
    "major disruption": 0.8,
    "complete shutdown": 1.0,
    "slight increase in traffic": 0.3,
    "heavy traffic": 0.75,
    "overwhelming traffic": 0.9,
  },
  
  // Farm/Agriculture
  farm: {
    "poor yield": 0.3,
    "below average yield": 0.4,
    "average yield": 0.5,
    "good yield": 0.7,
    "excellent yield": 0.85,
    "record yield": 0.95,
    "crop failure": 0.1,
    "partial loss": 0.4,
    "total loss": 0.0,
  },
  
  // Mine/Mining
  mine: {
    "low production": 0.3,
    "reduced output": 0.4,
    "normal production": 0.5,
    "high production": 0.75,
    "peak production": 0.9,
    "maximum capacity": 1.0,
    "minimal activity": 0.15,
    "suspended operations": 0.05,
  },
  
  // Energy
  energy: {
    "low output": 0.3,
    "reduced capacity": 0.4,
    "normal operation": 0.5,
    "high demand": 0.75,
    "peak load": 0.9,
    "critical load": 0.95,
    "blackout": 0.0,
    "brownout": 0.2,
    "full capacity": 1.0,
  },
};

/**
 * Comparative terms
 */
export const COMPARATIVE_TERMS: Record<string, (baseline: number) => number> = {
  // Increase comparisons
  "slightly above": (b) => Math.min(1, b + 0.1),
  "above": (b) => Math.min(1, b + 0.2),
  "well above": (b) => Math.min(1, b + 0.3),
  "far above": (b) => Math.min(1, b + 0.4),
  "much higher": (b) => Math.min(1, b * 1.5),
  "significantly higher": (b) => Math.min(1, b * 1.7),
  
  // Decrease comparisons
  "slightly below": (b) => Math.max(0, b - 0.1),
  "below": (b) => Math.max(0, b - 0.2),
  "well below": (b) => Math.max(0, b - 0.3),
  "far below": (b) => Math.max(0, b - 0.4),
  "much lower": (b) => Math.max(0, b * 0.5),
  "significantly lower": (b) => Math.max(0, b * 0.3),
  
  // Multiplication
  "double": () => Math.min(1, 0.5 * 2),
  "triple": () => Math.min(1, 0.33 * 3),
  "half": () => 0.5,
  "quarter": () => 0.25,
};

/**
 * Parse numeric magnitude from text
 */
export function parseNumericMagnitude(text: string): number | null {
  const normalized = text.toLowerCase().trim();
  
  // Check for percentage
  const percentMatch = normalized.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percentMatch) {
    const percent = parseFloat(percentMatch[1]);
    return Math.min(1, Math.max(0, percent / 100));
  }
  
  // Check for "X times" pattern
  const timesMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:times|x)/i);
  if (timesMatch) {
    const times = parseFloat(timesMatch[1]);
    // Convert to 0-1 scale (2x = 0.5, 10x = 0.9, etc.)
    return Math.min(1, Math.max(0, 1 - (1 / times)));
  }
  
  // Check for fraction
  const fractionMatch = normalized.match(/(\d+)\s*\/\s*(\d+)/);
  if (fractionMatch) {
    const numerator = parseInt(fractionMatch[1]);
    const denominator = parseInt(fractionMatch[2]);
    return denominator > 0 ? numerator / denominator : 0;
  }
  
  // Check for decimal
  const decimalMatch = normalized.match(/^(0?\.\d+|\d+\.\d+)$/);
  if (decimalMatch) {
    return Math.min(1, Math.max(0, parseFloat(decimalMatch[1])));
  }
  
  return null;
}

/**
 * Map magnitude expression to value
 */
export function mapMagnitudeToValue(expression: string): {
  value: number;
  confidence: number;
  type: "exact" | "modified" | "parsed" | "contextual";
} | null {
  const normalized = expression.toLowerCase().trim();
  
  // Check exact matches in change magnitudes
  if (CHANGE_MAGNITUDES[normalized]) {
    return {
      value: CHANGE_MAGNITUDES[normalized],
      confidence: 1.0,
      type: "exact"
    };
  }
  
  // Check size descriptors
  if (SIZE_DESCRIPTORS[normalized]) {
    return {
      value: SIZE_DESCRIPTORS[normalized],
      confidence: 1.0,
      type: "exact"
    };
  }
  
  // Check percentage magnitudes
  if (PERCENTAGE_MAGNITUDES[normalized]) {
    return {
      value: PERCENTAGE_MAGNITUDES[normalized],
      confidence: 1.0,
      type: "exact"
    };
  }
  
  // Try to parse numeric magnitude
  const numericValue = parseNumericMagnitude(normalized);
  if (numericValue !== null) {
    return {
      value: numericValue,
      confidence: 0.95,
      type: "parsed"
    };
  }
  
  // Check for modified expressions (e.g., "very large")
  const words = normalized.split(/\s+/);
  if (words.length === 2) {
    const [modifier, descriptor] = words;
    
    // Check if first word is a modifier
    if (MAGNITUDE_MODIFIERS.amplifiers[modifier as keyof typeof MAGNITUDE_MODIFIERS.amplifiers]) {
      const baseValue = SIZE_DESCRIPTORS[descriptor];
      if (baseValue) {
        const multiplier = MAGNITUDE_MODIFIERS.amplifiers[modifier as keyof typeof MAGNITUDE_MODIFIERS.amplifiers];
        return {
          value: Math.min(1, baseValue * multiplier),
          confidence: 0.9,
          type: "modified"
        };
      }
    }
    
    if (MAGNITUDE_MODIFIERS.diminishers[modifier as keyof typeof MAGNITUDE_MODIFIERS.diminishers]) {
      const baseValue = SIZE_DESCRIPTORS[descriptor];
      if (baseValue) {
        const multiplier = MAGNITUDE_MODIFIERS.diminishers[modifier as keyof typeof MAGNITUDE_MODIFIERS.diminishers];
        return {
          value: Math.max(0, baseValue * multiplier),
          confidence: 0.9,
          type: "modified"
        };
      }
    }
  }
  
  // Check for patterns like "big changes", "small shifts"
  for (const [pattern, value] of Object.entries(CHANGE_MAGNITUDES)) {
    if (normalized.includes(pattern)) {
      return {
        value,
        confidence: 0.85,
        type: "contextual"
      };
    }
  }
  
  return null;
}

/**
 * Extract magnitude expressions from text
 */
export function extractMagnitudeExpressions(text: string): Array<{
  expression: string;
  value: number;
  confidence: number;
  position: number;
  context?: string;
}> {
  const results: Array<{
    expression: string;
    value: number;
    confidence: number;
    position: number;
    context?: string;
  }> = [];
  
  const normalizedText = text.toLowerCase();
  
  // Check for exact phrase matches
  for (const [expression, value] of Object.entries(CHANGE_MAGNITUDES)) {
    const position = normalizedText.indexOf(expression);
    if (position !== -1) {
      results.push({
        expression,
        value,
        confidence: 1.0,
        position,
        context: "change"
      });
    }
  }
  
  // Check for size descriptors
  for (const [descriptor, value] of Object.entries(SIZE_DESCRIPTORS)) {
    const regex = new RegExp(`\\b${descriptor}\\b`, 'gi');
    let match;
    while ((match = regex.exec(normalizedText)) !== null) {
      // Check if not already part of a longer match
      const overlaps = results.some(r => 
        match.index >= r.position && match.index < r.position + r.expression.length
      );
      
      if (!overlaps) {
        results.push({
          expression: descriptor,
          value,
          confidence: 0.9,
          position: match.index
        });
      }
    }
  }
  
  // Check for percentage patterns
  const percentPattern = /(\d+(?:\.\d+)?)\s*%/g;
  let percentMatch;
  while ((percentMatch = percentPattern.exec(normalizedText)) !== null) {
    const percent = parseFloat(percentMatch[1]);
    const value = Math.min(1, Math.max(0, percent / 100));
    
    results.push({
      expression: percentMatch[0],
      value,
      confidence: 1.0,
      position: percentMatch.index,
      context: "percentage"
    });
  }
  
  // Sort by position
  results.sort((a, b) => a.position - b.position);
  
  return results;
}

/**
 * Get magnitude level from value
 */
export function getMagnitudeLevel(value: number): {
  level: keyof typeof MAGNITUDE_LEVELS;
  description: string;
} {
  if (value <= 0.1) return { level: "none", description: "No significant magnitude" };
  if (value <= 0.2) return { level: "minimal", description: "Minimal magnitude" };
  if (value <= 0.4) return { level: "small", description: "Small magnitude" };
  if (value <= 0.6) return { level: "moderate", description: "Moderate magnitude" };
  if (value <= 0.8) return { level: "significant", description: "Significant magnitude" };
  if (value <= 0.9) return { level: "large", description: "Large magnitude" };
  return { level: "extreme", description: "Extreme magnitude" };
}

/**
 * Apply modifier to base magnitude
 */
export function applyModifier(baseMagnitude: number, modifier: string): number {
  const normalizedModifier = modifier.toLowerCase().trim();
  
  if (MAGNITUDE_MODIFIERS.amplifiers[normalizedModifier as keyof typeof MAGNITUDE_MODIFIERS.amplifiers]) {
    const multiplier = MAGNITUDE_MODIFIERS.amplifiers[normalizedModifier as keyof typeof MAGNITUDE_MODIFIERS.amplifiers];
    return Math.min(1, baseMagnitude * multiplier);
  }
  
  if (MAGNITUDE_MODIFIERS.diminishers[normalizedModifier as keyof typeof MAGNITUDE_MODIFIERS.diminishers]) {
    const multiplier = MAGNITUDE_MODIFIERS.diminishers[normalizedModifier as keyof typeof MAGNITUDE_MODIFIERS.diminishers];
    return Math.max(0, baseMagnitude * multiplier);
  }
  
  return baseMagnitude;
}

/**
 * Format magnitude value to human-readable string
 */
export function formatMagnitude(value: number, context?: string): string {
  const level = getMagnitudeLevel(value);
  const percentage = Math.round(value * 100);
  
  if (context === "percentage") {
    return `${percentage}%`;
  }
  
  if (context === "change") {
    if (value <= 0.3) return "small change";
    if (value <= 0.5) return "moderate change";
    if (value <= 0.7) return "significant change";
    if (value <= 0.9) return "large change";
    return "extreme change";
  }
  
  return `${level.description} (${percentage}%)`;
}

/**
 * Detect magnitude context from surrounding text
 */
export function detectMagnitudeContext(text: string, position: number): {
  domain?: "port" | "farm" | "mine" | "energy";
  type?: "change" | "anomaly" | "variation" | "deviation" | "movement";
  isComparative: boolean;
  isPercentage: boolean;
} {
  const windowSize = 50;
  const start = Math.max(0, position - windowSize);
  const end = Math.min(text.length, position + windowSize);
  const context = text.substring(start, end).toLowerCase();
  
  // Detect domain
  let domain: "port" | "farm" | "mine" | "energy" | undefined;
  if (context.includes("port") || context.includes("ship") || context.includes("cargo")) {
    domain = "port";
  } else if (context.includes("farm") || context.includes("crop") || context.includes("yield")) {
    domain = "farm";
  } else if (context.includes("mine") || context.includes("mining") || context.includes("production")) {
    domain = "mine";
  } else if (context.includes("energy") || context.includes("power") || context.includes("capacity")) {
    domain = "energy";
  }
  
  // Detect type
  let type: "change" | "anomaly" | "variation" | "deviation" | "movement" | undefined;
  if (context.includes("change")) type = "change";
  else if (context.includes("anomaly")) type = "anomaly";
  else if (context.includes("variation")) type = "variation";
  else if (context.includes("deviation")) type = "deviation";
  else if (context.includes("movement")) type = "movement";
  
  // Detect if comparative
  const isComparative = /above|below|higher|lower|more|less|than/.test(context);
  
  // Detect if percentage
  const isPercentage = /%|percent/.test(context);
  
  return { domain, type, isComparative, isPercentage };
}

/**
 * Convex action to map magnitude expressions
 */
export const mapMagnitude = action({
  args: {
    text: v.string(),
    includeContext: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const result = mapMagnitudeToValue(args.text);
    
    if (!result) {
      // Try to extract from larger text
      const expressions = extractMagnitudeExpressions(args.text);
      if (expressions.length > 0) {
        const primary = expressions[0];
        const context = args.includeContext ? 
          detectMagnitudeContext(args.text, primary.position) : 
          undefined;
        
        return {
          value: primary.value,
          confidence: primary.confidence,
          expression: primary.expression,
          level: getMagnitudeLevel(primary.value),
          context
        };
      }
      
      return null;
    }
    
    const context = args.includeContext ? 
      detectMagnitudeContext(args.text, 0) : 
      undefined;
    
    return {
      ...result,
      level: getMagnitudeLevel(result.value),
      context
    };
  },
});

/**
 * Query to get magnitude mappings
 */
export const getMagnitudeMappings = query({
  args: {
    category: v.optional(v.union(
      v.literal("sizes"),
      v.literal("changes"),
      v.literal("percentages"),
      v.literal("modifiers"),
      v.literal("domain")
    )),
    domain: v.optional(v.union(
      v.literal("port"),
      v.literal("farm"),
      v.literal("mine"),
      v.literal("energy")
    )),
  },
  handler: async (ctx, args) => {
    if (!args.category) {
      return {
        sizes: SIZE_DESCRIPTORS,
        changes: CHANGE_MAGNITUDES,
        percentages: PERCENTAGE_MAGNITUDES,
        modifiers: MAGNITUDE_MODIFIERS
      };
    }
    
    switch (args.category) {
      case "sizes":
        return SIZE_DESCRIPTORS;
      
      case "changes":
        return CHANGE_MAGNITUDES;
      
      case "percentages":
        return PERCENTAGE_MAGNITUDES;
      
      case "modifiers":
        return MAGNITUDE_MODIFIERS;
      
      case "domain":
        if (args.domain) {
          return DOMAIN_SPECIFIC_MAGNITUDES[args.domain];
        }
        return DOMAIN_SPECIFIC_MAGNITUDES;
      
      default:
        return {};
    }
  },
});

/**
 * Action to extract all magnitude expressions
 */
export const extractAllMagnitudes = action({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    return extractMagnitudeExpressions(args.text);
  },
});

/**
 * Validate magnitude range
 */
export function isValidMagnitudeRange(min: number, max: number): {
  valid: boolean;
  reason?: string;
} {
  if (min < 0 || max < 0) {
    return { valid: false, reason: "Magnitude values cannot be negative" };
  }
  
  if (min > 1 || max > 1) {
    return { valid: false, reason: "Magnitude values cannot exceed 1.0" };
  }
  
  if (min > max) {
    return { valid: false, reason: "Minimum magnitude cannot exceed maximum" };
  }
  
  return { valid: true };
}

/**
 * Common magnitude presets for UI
 */
export const MAGNITUDE_PRESETS = [
  { label: "Any", min: 0, max: 1 },
  { label: "Small (< 30%)", min: 0, max: 0.3 },
  { label: "Moderate (30-60%)", min: 0.3, max: 0.6 },
  { label: "Significant (60-80%)", min: 0.6, max: 0.8 },
  { label: "Large (> 70%)", min: 0.7, max: 1 },
  { label: "Extreme (> 90%)", min: 0.9, max: 1 },
  { label: "Above Average (> 50%)", min: 0.5, max: 1 },
  { label: "Below Average (< 50%)", min: 0, max: 0.5 },
];

/**
 * Export all magnitude utilities
 */
export default {
  mapMagnitudeToValue,
  extractMagnitudeExpressions,
  getMagnitudeLevel,
  applyModifier,
  formatMagnitude,
  detectMagnitudeContext,
  parseNumericMagnitude,
  isValidMagnitudeRange,
  MAGNITUDE_LEVELS,
  SIZE_DESCRIPTORS,
  CHANGE_MAGNITUDES,
  PERCENTAGE_MAGNITUDES,
  MAGNITUDE_MODIFIERS,
  DOMAIN_SPECIFIC_MAGNITUDES,
  MAGNITUDE_PRESETS,
};
