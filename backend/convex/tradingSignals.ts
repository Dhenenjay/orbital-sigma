/**
 * Simplified Trading Signals Generator
 * Returns actionable instrument recommendations from anomalies
 */

import { v } from "convex/values";
import { action, mutation } from "./_generated/server";
import { api } from "./_generated/api";
import OpenAI from 'openai';

// Trading signal interface
export interface TradingSignal {
  instrument: string;
  direction: 'long' | 'short' | 'neutral';
  rationale: string;
  confidence: number;
}

// Extended signal with metadata
export interface ExtendedTradingSignal extends TradingSignal {
  aoi_id: string;
  domain: string;
  anomaly_magnitude: number;
  timestamp: string;
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Trading signals prompt
const tradingPrompt = `You are an advanced AI trading strategist analyzing satellite-detected anomalies. 
Your task is to generate actionable trading signals based on geospatial intelligence.

For each anomaly, consider:
1. Direct market impact (affected commodities, companies, sectors)
2. Supply chain implications (upstream/downstream effects)
3. Regional/global ripple effects
4. Market positioning and sentiment

Return a JSON array of trading signals with this exact format:
[{
  "instrument": "TICKER", // Stock, ETF, commodity future, or forex pair
  "direction": "long" or "short" or "neutral",
  "rationale": "Clear explanation linking anomaly to market impact",
  "confidence": 0.0-1.0 // Based on anomaly severity and clarity of impact
}]

Focus on liquid, tradeable instruments. Prioritize high-conviction ideas.`;

/**
 * Generate trading signals from anomalies
 */
export const generateTradingSignals = action({
  args: {
    queryId: v.optional(v.id("queries")), // Optional queryId to link signals
    anomalies: v.array(v.object({
      aoi_id: v.string(),
      aoi_name: v.string(),
      domain: v.union(
        v.literal("port"),
        v.literal("farm"),
        v.literal("mine"),
        v.literal("energy")
      ),
      magnitude: v.number(),
      confidence: v.number(),
      baseline: v.optional(v.number()),
      timestamp: v.string(),
      location: v.optional(v.object({
        lat: v.number(),
        lng: v.number(),
        region: v.optional(v.string()),
      })),
      description: v.optional(v.string()),
    })),
    market_context: v.optional(v.object({
      vix_level: v.optional(v.number()),
      dollar_index: v.optional(v.number()),
      commodity_trends: v.optional(v.array(v.string())),
      geopolitical_events: v.optional(v.array(v.string())),
    })),
    max_signals: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    signals: ExtendedTradingSignal[];
    summary: any;
    processing_time_ms: number;
  }> => {
    const startTime = Date.now();
    const maxSignals = args.max_signals || 5;
    const userId = "system"; // TODO: Get actual userId from context when available
    
    console.log(`Generating trading signals for ${args.anomalies.length} anomalies`);
    
    const allSignals: ExtendedTradingSignal[] = [];
    let totalTokensUsed = 0;
    let totalCost = 0;
    
    // Process anomalies in batches for efficiency
    const batchSize = 3;
    for (let i = 0; i < args.anomalies.length; i += batchSize) {
      const batch = args.anomalies.slice(i, i + batchSize);
      const batchStartTime = Date.now();
      
      try {
        // Construct prompt for this batch
        const userPrompt = constructTradingPrompt(batch, args.market_context);
        
        // Call GPT-5 for trading signals
        const completion = await openai.chat.completions.create({
          model: "gpt-4-turbo-preview", // Will use GPT-5 when available
          messages: [
            { role: "system", content: tradingPrompt },
            { role: "user", content: userPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.2, // Lower temperature for more consistent trading signals
          max_tokens: 2000,
        });
        
        // Log token usage
        if (completion.usage) {
          const batchEndTime = Date.now();
          await ctx.runMutation(api.tokenUsage.logTokenUsage, {
            userId,
            queryId: args.queryId,
            model: "gpt-4-turbo-preview",
            prompt_tokens: completion.usage.prompt_tokens,
            completion_tokens: completion.usage.completion_tokens,
            total_tokens: completion.usage.total_tokens,
            endpoint: "generateTradingSignals",
            purpose: `Trading signals batch ${i/batchSize + 1}`,
            anomaly_count: batch.length,
            signal_count: 0, // Will be updated below
            cache_hit: false,
            response_time_ms: batchEndTime - batchStartTime,
          });
          
          totalTokensUsed += completion.usage.total_tokens;
        }
        
        const responseText = completion.choices[0].message.content;
        if (!responseText) {
          console.error("No response from OpenAI for batch", i);
          continue;
        }
        
        // Parse the JSON response with robust error handling
        const signals: TradingSignal[] = parseSignalsResponse(responseText);
        
        // Validate and enhance signals with metadata
        for (const signal of signals) {
          if (validateSignal(signal)) {
            // Match signal to anomaly (simple heuristic based on domain)
            const matchedAnomaly = batch.find(a => 
              isDomainRelevantToInstrument(a.domain, signal.instrument)
            ) || batch[0];
            
            allSignals.push({
              ...signal,
              aoi_id: matchedAnomaly.aoi_id,
              domain: matchedAnomaly.domain,
              anomaly_magnitude: matchedAnomaly.magnitude,
              timestamp: new Date().toISOString(),
            });
          }
        }
        
        // Rate limiting delay
        if (i + batchSize < args.anomalies.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
      } catch (error) {
        console.error(`Error processing batch ${i}:`, error);
        // Generate fallback signals for this batch
        for (const anomaly of batch) {
          const fallback = generateFallbackSignal(anomaly);
          if (fallback) {
            allSignals.push({
              ...fallback,
              aoi_id: anomaly.aoi_id,
              domain: anomaly.domain,
              anomaly_magnitude: anomaly.magnitude,
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
    }
    
    // Sort by confidence and limit to max signals
    allSignals.sort((a, b) => b.confidence - a.confidence);
    const topSignals = allSignals.slice(0, maxSignals);
    
    // Generate summary
    const summary = generateTradingSummary(topSignals, args.anomalies);
    
    const processingTime = Date.now() - startTime;
    
    // Prepare response with parsed signals
    const response = {
      signals: topSignals.map(signal => ({
        instrument: signal.instrument,
        direction: signal.direction,
        rationale: signal.rationale,
        confidence: signal.confidence,
        aoi_id: signal.aoi_id,
        domain: signal.domain,
        magnitude: signal.anomaly_magnitude,
        timestamp: signal.timestamp,
      })),
      summary,
      processing_time_ms: processingTime,
      query_id: args.queryId,
      status: 'completed' as const,
      generated_at: new Date().toISOString(),
    };
    
    // Store signals in database if queryId provided (non-blocking)
    if (args.queryId) {
      // Store signals asynchronously but return immediately
      ctx.runMutation("tradingSignals:storeSignals", {
        queryId: args.queryId,
        signals: topSignals.map(signal => ({
          instrument: signal.instrument,
          direction: signal.direction,
          rationale: signal.rationale,
          confidence: signal.confidence,
          aoi_id: signal.aoi_id,
          domain: signal.domain,
          magnitude: signal.anomaly_magnitude,
        })),
        replaceExisting: true,
      }).then(signalIds => {
        console.log(`Stored ${signalIds.length} signals for query ${args.queryId}`);
      }).catch(error => {
        console.error(`Failed to store signals for query ${args.queryId}:`, error);
      });
    }
    
    // Return parsed signals immediately to frontend
    return response;
  },
});

/**
 * Parse signals response with fallback methods
 */
function parseSignalsResponse(responseText: string): TradingSignal[] {
  // Method 1: Try direct JSON parse
  try {
    const parsed = JSON.parse(responseText);
    
    // Handle if it's wrapped in an object like { "signals": [...] }
    if (parsed.signals && Array.isArray(parsed.signals)) {
      return parsed.signals;
    }
    
    // Handle if it's a direct array
    if (Array.isArray(parsed)) {
      return parsed;
    }
    
    // Handle if it's a single object, wrap in array
    if (parsed.instrument && parsed.direction) {
      return [parsed];
    }
  } catch (error) {
    console.log("Direct JSON parse failed, trying fallback methods");
  }
  
  // Method 2: Try to extract JSON array using regex
  try {
    // Look for array pattern [...]
    const arrayMatch = responseText.match(/\[\s*\{[^\]]*\}\s*\]/s);
    if (arrayMatch) {
      const extracted = arrayMatch[0];
      // Clean up common issues
      const cleaned = extracted
        .replace(/([\{,]\s*)([\w]+):/g, '$1"$2":') // Add quotes to keys
        .replace(/'/g, '"') // Replace single quotes
        .replace(/\n/g, ' ') // Remove newlines
        .replace(/,\s*([\]\}])/g, '$1'); // Remove trailing commas
      
      return JSON.parse(cleaned);
    }
  } catch (error) {
    console.log("Regex array extraction failed");
  }
  
  // Method 3: Try to extract individual signal objects
  try {
    const signals: TradingSignal[] = [];
    
    // Pattern to match individual signal objects
    const signalPattern = /\{[^\}]*"instrument"\s*:\s*"([^"]+)"[^\}]*"direction"\s*:\s*"(long|short|neutral)"[^\}]*"rationale"\s*:\s*"([^"]+)"[^\}]*"confidence"\s*:\s*([0-9.]+)[^\}]*\}/gi;
    
    let match;
    while ((match = signalPattern.exec(responseText)) !== null) {
      signals.push({
        instrument: match[1],
        direction: match[2] as 'long' | 'short' | 'neutral',
        rationale: match[3],
        confidence: parseFloat(match[4]),
      });
    }
    
    if (signals.length > 0) {
      return signals;
    }
  } catch (error) {
    console.log("Individual signal extraction failed");
  }
  
  // Method 4: Try to extract from markdown code blocks
  try {
    // Look for JSON in markdown code blocks
    const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      const codeContent = codeBlockMatch[1].trim();
      return parseSignalsResponse(codeContent); // Recursive call with extracted content
    }
  } catch (error) {
    console.log("Markdown extraction failed");
  }
  
  // Method 5: Try line-by-line parsing for structured text
  try {
    const lines = responseText.split('\n');
    const signals: TradingSignal[] = [];
    let currentSignal: Partial<TradingSignal> = {};
    
    for (const line of lines) {
      // Look for instrument
      const instrumentMatch = line.match(/instrument[:\s]+([A-Z]{2,10})/i);
      if (instrumentMatch) {
        currentSignal.instrument = instrumentMatch[1];
      }
      
      // Look for direction
      const directionMatch = line.match(/direction[:\s]+(long|short|neutral)/i);
      if (directionMatch) {
        currentSignal.direction = directionMatch[1].toLowerCase() as 'long' | 'short' | 'neutral';
      }
      
      // Look for confidence
      const confidenceMatch = line.match(/confidence[:\s]+([0-9.]+)/i);
      if (confidenceMatch) {
        currentSignal.confidence = parseFloat(confidenceMatch[1]);
      }
      
      // Look for rationale (may span multiple lines)
      const rationaleMatch = line.match(/rationale[:\s]+(.+)/i);
      if (rationaleMatch) {
        currentSignal.rationale = rationaleMatch[1].trim();
      }
      
      // If we have all required fields, add to signals
      if (currentSignal.instrument && currentSignal.direction && 
          currentSignal.rationale && currentSignal.confidence !== undefined) {
        signals.push(currentSignal as TradingSignal);
        currentSignal = {}; // Reset for next signal
      }
    }
    
    if (signals.length > 0) {
      return signals;
    }
  } catch (error) {
    console.log("Line-by-line parsing failed");
  }
  
  // Method 6: Last resort - try to extract key information
  try {
    const signals: TradingSignal[] = [];
    
    // Find all ticker-like symbols
    const tickers = responseText.match(/\b[A-Z]{2,10}\b/g) || [];
    
    // Find direction keywords
    const hasLong = /\b(long|buy|bullish)\b/i.test(responseText);
    const hasShort = /\b(short|sell|bearish)\b/i.test(responseText);
    
    // Find confidence-like numbers
    const confidenceMatch = responseText.match(/\b(0\.\d+|\d{1,2}%)\b/);
    const confidence = confidenceMatch ? 
      (confidenceMatch[0].includes('%') ? 
        parseFloat(confidenceMatch[0]) / 100 : 
        parseFloat(confidenceMatch[0])) : 0.5;
    
    // Create a basic signal if we found a ticker
    if (tickers.length > 0) {
      const direction = hasShort ? 'short' : hasLong ? 'long' : 'neutral';
      
      signals.push({
        instrument: tickers[0],
        direction: direction as 'long' | 'short' | 'neutral',
        rationale: `Extracted from response: ${responseText.substring(0, 200)}...`,
        confidence: Math.min(confidence, 0.5), // Cap confidence for extracted signals
      });
    }
    
    if (signals.length > 0) {
      console.log("Used last resort extraction method");
      return signals;
    }
  } catch (error) {
    console.log("Last resort extraction failed");
  }
  
  // If all methods fail, throw error
  throw new Error(`Could not parse trading signals from response: ${responseText.substring(0, 500)}...`);
}

/**
 * Construct a focused trading prompt
 */
function constructTradingPrompt(
  anomalies: any[],
  market_context?: any
): string {
  let prompt = "Analyze these satellite anomalies and generate trading signals:\n\n";
  
  // Add each anomaly
  anomalies.forEach((anomaly, index) => {
    prompt += `## Anomaly ${index + 1}\n`;
    prompt += `- Location: ${anomaly.aoi_name} (${anomaly.domain.toUpperCase()})\n`;
    prompt += `- Magnitude: ${anomaly.magnitude.toFixed(3)} (${getIntensity(anomaly.magnitude)})\n`;
    prompt += `- Confidence: ${(anomaly.confidence * 100).toFixed(1)}%\n`;
    
    if (anomaly.baseline) {
      const change = ((anomaly.magnitude - anomaly.baseline) / anomaly.baseline * 100);
      prompt += `- Change from baseline: ${change > 0 ? '+' : ''}${change.toFixed(1)}%\n`;
    }
    
    if (anomaly.location?.region) {
      prompt += `- Region: ${anomaly.location.region}\n`;
    }
    
    if (anomaly.description) {
      prompt += `- Description: ${anomaly.description}\n`;
    }
    
    prompt += "\n";
  });
  
  // Add market context if available
  if (market_context) {
    prompt += "## Market Context\n";
    
    if (market_context.vix_level) {
      prompt += `- VIX: ${market_context.vix_level} (${getVolatilityRegime(market_context.vix_level)})\n`;
    }
    
    if (market_context.dollar_index) {
      prompt += `- Dollar Index: ${market_context.dollar_index}\n`;
    }
    
    if (market_context.commodity_trends?.length > 0) {
      prompt += `- Commodity Trends: ${market_context.commodity_trends.join(', ')}\n`;
    }
    
    if (market_context.geopolitical_events?.length > 0) {
      prompt += `- Geopolitical Events: ${market_context.geopolitical_events.join('; ')}\n`;
    }
    
    prompt += "\n";
  }
  
  // Instructions
  prompt += "Generate trading signals for the most actionable opportunities. ";
  prompt += "Focus on liquid instruments with clear catalysts. ";
  prompt += "Return as JSON array with format: [{instrument, direction, rationale, confidence}]";
  
  return prompt;
}

/**
 * Validate a trading signal
 */
function validateSignal(signal: any): signal is TradingSignal {
  return (
    typeof signal.instrument === 'string' &&
    signal.instrument.length > 0 &&
    signal.instrument.length < 10 && // Reasonable ticker length
    ['long', 'short', 'neutral'].includes(signal.direction) &&
    typeof signal.rationale === 'string' &&
    signal.rationale.length > 50 && // Meaningful rationale
    typeof signal.confidence === 'number' &&
    signal.confidence >= 0 &&
    signal.confidence <= 1
  );
}

/**
 * Check if domain is relevant to instrument
 */
function isDomainRelevantToInstrument(domain: string, instrument: string): boolean {
  const domainInstruments: Record<string, string[]> = {
    port: ['ZIM', 'MATX', 'DAC', 'GSL', 'SBLK', 'GOGL', 'FDX', 'UPS', 'XPO', 'BOAT', 'SEA'],
    farm: ['ADM', 'BG', 'AGRO', 'NTR', 'MOS', 'CF', 'DE', 'AGCO', 'DBA', 'CORN', 'WEAT', 'SOYB'],
    mine: ['FCX', 'SCCO', 'TECK', 'BHP', 'RIO', 'VALE', 'NEM', 'GOLD', 'XME', 'COPX', 'GDX'],
    energy: ['XOM', 'CVX', 'COP', 'BP', 'VLO', 'MPC', 'PSX', 'XLE', 'USO', 'UNG'],
  };
  
  return domainInstruments[domain]?.some(ticker => 
    instrument.toUpperCase().includes(ticker)
  ) || false;
}

/**
 * Generate fallback signal for an anomaly
 */
function generateFallbackSignal(anomaly: any): TradingSignal | null {
  // Domain-specific default instruments
  const defaultInstruments: Record<string, string> = {
    port: 'BOAT',  // Shipping ETF
    farm: 'DBA',   // Agriculture ETF
    mine: 'XME',   // Mining ETF
    energy: 'XLE', // Energy ETF
  };
  
  const instrument = defaultInstruments[anomaly.domain] || 'SPY';
  
  // Simple heuristic for direction
  let direction: 'long' | 'short' | 'neutral' = 'neutral';
  if (anomaly.magnitude > 0.7 && anomaly.confidence > 0.6) {
    // High magnitude anomalies often indicate disruption
    direction = anomaly.domain === 'port' || anomaly.domain === 'energy' ? 'short' : 'long';
  } else if (anomaly.magnitude < 0.3) {
    direction = 'neutral';
  }
  
  const rationale = `Automated signal: ${getIntensity(anomaly.magnitude)} anomaly detected in ${anomaly.domain} sector at ${anomaly.aoi_name}. ` +
    `Using sector ETF ${instrument} as proxy. Manual analysis recommended for specific instrument selection. ` +
    `Risk: This is a fallback signal with limited analysis.`;
  
  return {
    instrument,
    direction,
    rationale,
    confidence: Math.min(anomaly.confidence * 0.5, 0.4), // Cap fallback confidence
  };
}

/**
 * Get intensity description
 */
function getIntensity(magnitude: number): string {
  if (magnitude >= 0.8) return "Critical";
  if (magnitude >= 0.6) return "High";
  if (magnitude >= 0.4) return "Moderate";
  if (magnitude >= 0.2) return "Low";
  return "Minimal";
}

/**
 * Get volatility regime
 */
function getVolatilityRegime(vix: number): string {
  if (vix < 12) return "Ultra-low volatility";
  if (vix < 20) return "Normal";
  if (vix < 30) return "Elevated";
  if (vix < 40) return "High stress";
  return "Extreme fear";
}

/**
 * Generate trading summary
 */
function generateTradingSummary(signals: ExtendedTradingSignal[], anomalies: any[]) {
  const longCount = signals.filter(s => s.direction === 'long').length;
  const shortCount = signals.filter(s => s.direction === 'short').length;
  const neutralCount = signals.filter(s => s.direction === 'neutral').length;
  
  const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length || 0;
  
  const instrumentTypes = new Set(signals.map(s => {
    if (s.instrument.length === 2 || s.instrument.length === 3) {
      // Likely a commodity future
      return 'futures';
    } else if (s.instrument.includes('ETF') || ['SPY', 'DBA', 'XLE', 'XME'].includes(s.instrument)) {
      return 'etf';
    } else {
      return 'equity';
    }
  }));
  
  const sectorExposure = signals.reduce((acc, s) => {
    acc[s.domain] = (acc[s.domain] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    total_signals: signals.length,
    directional_bias: {
      long: longCount,
      short: shortCount,
      neutral: neutralCount,
      net_direction: longCount > shortCount ? 'bullish' : shortCount > longCount ? 'bearish' : 'balanced',
    },
    average_confidence: avgConfidence,
    confidence_rating: avgConfidence > 0.7 ? 'high' : avgConfidence > 0.5 ? 'moderate' : 'low',
    instrument_types: Array.from(instrumentTypes),
    sector_exposure: sectorExposure,
    top_picks: signals.slice(0, 3).map(s => ({
      instrument: s.instrument,
      direction: s.direction,
      confidence: `${(s.confidence * 100).toFixed(0)}%`,
    })),
    anomalies_processed: anomalies.length,
    signals_generated: signals.length,
    signal_quality: avgConfidence > 0.6 && signals.length > 0 ? 'actionable' : 'review_recommended',
  };
}

/**
 * Store trading signals in database
 */
export const storeSignals = mutation({
  args: {
    queryId: v.id("queries"),
    signals: v.array(v.object({
      instrument: v.string(),
      direction: v.string(),
      rationale: v.string(),
      confidence: v.number(),
      aoi_id: v.string(),
      domain: v.string(),
      magnitude: v.number(),
    })),
    replaceExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // If replaceExisting, delete old signals for this query
    if (args.replaceExisting) {
      const existingSignals = await ctx.db
        .query("signals")
        .withIndex("by_queryId", q => q.eq("queryId", args.queryId))
        .collect();
      
      for (const signal of existingSignals) {
        await ctx.db.delete(signal._id);
      }
    }
    
    // Insert new signals
    const signalIds: string[] = [];
    for (const signal of args.signals) {
      const id = await ctx.db.insert("signals", {
        queryId: args.queryId,
        aoi: {
          id: signal.aoi_id,
          domain: signal.domain,
        },
        magnitude: signal.magnitude,
        confidence: signal.confidence,
        direction: signal.direction,
        thesis: signal.rationale, // Map rationale to thesis field
      });
      signalIds.push(id);
    }
    
    console.log(`Stored ${signalIds.length} signals for query ${args.queryId}`);
    return signalIds;
  },
});

/**
 * Get stored signals for a query
 */
export const getSignalsForQuery = mutation({
  args: {
    queryId: v.id("queries"),
  },
  handler: async (ctx, args) => {
    const signals = await ctx.db
      .query("signals")
      .withIndex("by_queryId", q => q.eq("queryId", args.queryId))
      .collect();
    
    return signals;
  },
});

/**
 * Quick signal generation for real-time use
 */
export const quickSignal = action({
  args: {
    aoi_id: v.string(),
    domain: v.union(
      v.literal("port"),
      v.literal("farm"),
      v.literal("mine"),
      v.literal("energy")
    ),
    magnitude: v.number(),
    confidence: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<TradingSignal> => {
    const anomaly = {
      aoi_id: args.aoi_id,
      aoi_name: args.aoi_id,
      domain: args.domain,
      magnitude: args.magnitude,
      confidence: args.confidence,
      timestamp: new Date().toISOString(),
      description: args.description,
    };
    
    const result = await ctx.runAction("tradingSignals:generateTradingSignals", {
      anomalies: [anomaly],
      max_signals: 1,
    });
    
    if (result.signals.length > 0) {
      const signal = result.signals[0];
      return {
        instrument: signal.instrument,
        direction: signal.direction,
        rationale: signal.rationale,
        confidence: signal.confidence,
      };
    }
    
    // Fallback if no signal generated
    const fallback = generateFallbackSignal(anomaly);
    if (fallback) {
      return fallback;
    }
    
    throw new Error("Could not generate trading signal");
  },
});
