/**
 * Generate trading signals from anomalies using GPT-5 market analysis
 */

import { v } from "convex/values";
import { action, mutation } from "./_generated/server";
import { api } from "./_generated/api";
import OpenAI from 'openai';
import type {
  MarketAnalysisRequest, 
  MarketAnalysisResponse,
  MarketAnalysisSummary 
} from './types/marketAnalysis';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt for GPT analysis
const systemPrompt = `You are GPT-5, a Senior Macro/Market Analyst specializing in geospatial intelligence. 
Analyze satellite imagery anomalies and provide structured JSON market intelligence.

Your analysis should include:
1. Anomaly severity assessment and confidence levels
2. Economic impact across immediate, medium-term, and long-term horizons
3. Risk assessment (operational, market, geopolitical)
4. Actionable recommendations with priorities and rationales
5. Historical comparisons and pattern recognition
6. Market signals (bullish/bearish indicators)

Be quantitative, specific, and action-oriented in your analysis.`;

/**
 * Main action to generate signals from anomalies using GPT-5
 */
export const generateSignals = action({
    args: {
        query: v.string(),
    },
    handler: async (ctx, args) => {
        const { query } = args;
        const startTime = Date.now();

        // 1. Parse the query to get AOIs and other parameters
        const queryParams = await ctx.runAction(api.parseNaturalLanguageQuery.parseNaturalLanguageQuery, { query });

        // 2. Find matching AOIs from the database
        const matchedAOIs = await ctx.runAction(api.matchAOIs.findMatchingAOIs, { queryParams });

        // 3. For now, simulate anomalies since we can't fetch real satellite data from Convex
        // In production, this would call an external API or use stored data
        const anomalies = matchedAOIs.slice(0, 5).map((aoi: any) => ({
            aoi_id: aoi.id || aoi._id,
            aoi_name: aoi.name,
            domain: aoi.type || 'unknown',
            magnitude: Math.random() * 0.8 + 0.2, // Simulated magnitude
            confidence: Math.random() * 0.5 + 0.5, // Simulated confidence
            timestamp: new Date().toISOString(),
            location: {
                lat: aoi.coordinates?.lat || aoi.lat || 0,
                lng: aoi.coordinates?.lng || aoi.lng || 0,
            },
        }));

        const result = await ctx.runAction(api.generateSignals.generateSignalsFromAnomalies, { 
            queryId: matchedAOIs.queryId, 
            anomalies: anomalies 
        });

        const processingTime = Date.now() - startTime;

        return {
            success: true,
            signalsGenerated: result.signals.length,
            analysesCompleted: result.analyses.length,
            processingTimeMs: processingTime,
            signals: result.signals,
            summary: result.summary,
        };
    },
});

export const generateSignalsFromAnomalies = action({
  args: {
    queryId: v.id("queries"),
    anomalies: v.array(v.any()),
    context: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { queryId, anomalies, context } = args;
    const startTime = Date.now();
    
    console.log(`Processing ${anomalies.length} anomalies for signal generation`);
    
    // Process each anomaly through GPT-5
    const analyses: MarketAnalysisResponse[] = [];
    const signals = [];
    
    for (const anomaly of anomalies) {
      try {
        // Prepare the analysis request
        const analysisRequest: MarketAnalysisRequest = {
          aoi_id: anomaly.aoi_id,
          domain: anomaly.domain === "unknown" ? "port" : anomaly.domain, // Default to port if unknown
          anomaly_data: {
            magnitude: anomaly.magnitude,
            confidence: anomaly.confidence,
            historical_baseline: anomaly.baseline || anomaly.magnitude * 0.5, // Estimate if not provided
            detection_timestamp: anomaly.timestamp,
            instrument_quality: anomaly.instrument_quality,
          },
          embedding_data: anomaly.embeddings,
          context: {
            geographic_region: anomaly.location?.region || "Unknown",
            recent_events: context?.recent_events,
            market_conditions: context?.market_conditions,
            seasonal_factors: context?.seasonal_factors,
          },
        };
        
        // Get GPT-5 analysis
        const analysis = await analyzeAnomalyWithGPT(analysisRequest);
        analyses.push(analysis);
        
        // Convert analysis to trading signal
        const signal = convertAnalysisToSignal(anomaly, analysis);
        signals.push(signal);
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error processing anomaly ${anomaly.aoi_id}:`, error);
        
        // Create a basic signal even if GPT analysis fails
        const fallbackSignal = createFallbackSignal(anomaly);
        signals.push(fallbackSignal);
      }
    }
    
    // Save signals to database
    const saveResult = await ctx.runMutation("signals:saveSignals", {
      queryId,
      signals,
      replaceExisting: true,
    });
    
    // Store the detailed analyses
    for (const analysis of analyses) {
      await ctx.runMutation("internal:marketAnalysis:storeAnalysis", {
        queryId,
        analysis,
      });
    }
    
    const processingTime = Date.now() - startTime;
    
    return {
      success: true,
      signalsGenerated: signals.length,
      analysesCompleted: analyses.length,
      processingTimeMs: processingTime,
      signals,
      summary: generateSummary(signals, analyses),
    };
  },
});

/**
 * Call GPT-5 (or GPT-4) to analyze an anomaly
 */
async function analyzeAnomalyWithGPT(request: MarketAnalysisRequest): Promise<MarketAnalysisResponse> {
  const userPrompt = constructDetailedPrompt(request);
  
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview", // Will use GPT-5 when available
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 4000,
    });
    
    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error("No response from OpenAI");
    }
    
    const analysis: MarketAnalysisResponse = JSON.parse(responseText);
    return analysis;
    
  } catch (error) {
    console.error("GPT analysis error:", error);
    throw error;
  }
}

/**
 * Construct a detailed prompt for GPT-5 analysis
 */
function constructDetailedPrompt(request: MarketAnalysisRequest): string {
  const { aoi_id, domain, anomaly_data, embedding_data, context } = request;
  
  let prompt = `Analyze this satellite imagery anomaly for market intelligence:\n\n`;
  
  // Core anomaly data
  prompt += `## Anomaly Detection\n`;
  prompt += `- AOI: ${aoi_id}\n`;
  prompt += `- Domain: ${domain.toUpperCase()}\n`;
  prompt += `- Timestamp: ${anomaly_data.detection_timestamp}\n`;
  prompt += `- Magnitude: ${anomaly_data.magnitude.toFixed(4)} (${getAnomalySeverity(anomaly_data.magnitude)})\n`;
  prompt += `- Confidence: ${(anomaly_data.confidence * 100).toFixed(1)}%\n`;
  
  // Calculate change metrics
  const baselineValue = anomaly_data.historical_baseline;
  const changePercent = ((anomaly_data.magnitude - baselineValue) / baselineValue * 100);
  prompt += `- Historical Baseline: ${baselineValue.toFixed(4)}\n`;
  prompt += `- Change from Baseline: ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%\n`;
  
  // Data quality indicators
  if (anomaly_data.instrument_quality !== undefined) {
    prompt += `- Sensor Quality: ${(anomaly_data.instrument_quality * 100).toFixed(1)}%\n`;
  }
  
  // Embedding insights if available
  if (embedding_data) {
    prompt += `\n## Embedding Analysis\n`;
    prompt += `- Dimensions Analyzed: ${embedding_data.current.length}\n`;
    
    if (embedding_data.weighted_magnitude !== undefined) {
      prompt += `- Domain-Weighted Magnitude: ${embedding_data.weighted_magnitude.toFixed(4)}\n`;
    }
    
    // Calculate dimension volatility
    const changes = embedding_data.current.map((val, i) => 
      Math.abs(val - (embedding_data.baseline[i] || 0))
    );
    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    const maxChange = Math.max(...changes);
    
    prompt += `- Average Dimensional Change: ${avgChange.toFixed(4)}\n`;
    prompt += `- Maximum Dimensional Change: ${maxChange.toFixed(4)}\n`;
    prompt += `- Volatility Index: ${(maxChange / avgChange).toFixed(2)}\n`;
  }
  
  // Contextual information
  if (context) {
    prompt += `\n## Market Context\n`;
    prompt += `- Geographic Region: ${context.geographic_region}\n`;
    
    if (context.recent_events && context.recent_events.length > 0) {
      prompt += `- Recent Regional Events:\n`;
      context.recent_events.forEach(event => prompt += `  • ${event}\n`);
    }
    
    if (context.market_conditions && context.market_conditions.length > 0) {
      prompt += `- Current Market Conditions:\n`;
      context.market_conditions.forEach(condition => prompt += `  • ${condition}\n`);
    }
    
    if (context.seasonal_factors && context.seasonal_factors.length > 0) {
      prompt += `- Seasonal Considerations:\n`;
      context.seasonal_factors.forEach(factor => prompt += `  • ${factor}\n`);
    }
  }
  
  // Domain-specific analysis requirements
  prompt += `\n## Domain-Specific Analysis Requirements\n`;
  
  switch (domain) {
    case 'port':
      prompt += `Focus on: vessel traffic patterns, container throughput, supply chain disruptions, trade flow impacts.\n`;
      break;
    case 'farm':
      prompt += `Focus on: crop health indicators, yield projections, irrigation changes, harvest timing impacts.\n`;
      break;
    case 'mine':
      prompt += `Focus on: extraction activity levels, stockpile changes, commodity supply impacts, environmental compliance.\n`;
      break;
    case 'energy':
      prompt += `Focus on: facility operational status, production capacity changes, storage levels, infrastructure modifications.\n`;
      break;
  }
  
  // Analysis instructions
  prompt += `\n## Required Analysis\n`;
  prompt += `Provide comprehensive market intelligence including:\n`;
  prompt += `1. Immediate trading signal implications (direction, magnitude, confidence)\n`;
  prompt += `2. Economic impact assessment (immediate, medium-term, long-term)\n`;
  prompt += `3. Risk factors and mitigation strategies\n`;
  prompt += `4. Comparable historical events and outcomes\n`;
  prompt += `5. Specific actionable recommendations for traders/investors\n`;
  prompt += `\nReturn as structured JSON per the defined schema. Be quantitative and specific.`;
  
  return prompt;
}

/**
 * Convert GPT-5 analysis to a trading signal
 */
function convertAnalysisToSignal(anomaly: any, analysis: MarketAnalysisResponse) {
  // Determine signal direction based on analysis
  let direction = "neutral";
  let adjustedMagnitude = anomaly.magnitude;
  
  // Use market signals to determine direction
  const bullishCount = analysis.market_signals.bullish_indicators.length;
  const bearishCount = analysis.market_signals.bearish_indicators.length;
  
  if (bullishCount > bearishCount * 1.5) {
    direction = "long";
  } else if (bearishCount > bullishCount * 1.5) {
    direction = "short";
  } else if (Math.abs(bullishCount - bearishCount) <= 1) {
    direction = "neutral";
  } else {
    direction = bullishCount > bearishCount ? "long" : "short";
  }
  
  // Adjust magnitude based on confidence and risk assessment
  const riskMultiplier = getRiskMultiplier(analysis.risk_assessment);
  adjustedMagnitude = adjustedMagnitude * analysis.anomaly_assessment.confidence * riskMultiplier;
  
  // Create investment thesis
  const thesis = createInvestmentThesis(anomaly, analysis, direction);
  
  return {
    aoi: {
      id: anomaly.aoi_id,
      name: anomaly.aoi_name,
      domain: anomaly.domain,
      location: anomaly.location,
    },
    magnitude: adjustedMagnitude,
    confidence: analysis.anomaly_assessment.confidence,
    direction,
    thesis,
    analysis_id: analysis.analysis_id,
    severity: analysis.anomaly_assessment.severity,
    economic_impact: analysis.economic_impact.immediate.magnitude,
    top_recommendation: analysis.recommendations.immediate_actions[0]?.action || "Monitor closely",
  };
}

/**
 * Create a fallback signal when GPT analysis fails
 */
function createFallbackSignal(anomaly: any) {
  const magnitude = anomaly.magnitude;
  const confidence = anomaly.confidence;
  
  // Simple heuristic for direction
  let direction = "neutral";
  if (magnitude > 0.7 && confidence > 0.6) {
    direction = anomaly.domain === "port" || anomaly.domain === "energy" ? "short" : "long";
  } else if (magnitude > 0.4 && confidence > 0.5) {
    direction = "neutral";
  }
  
  return {
    aoi: {
      id: anomaly.aoi_id,
      name: anomaly.aoi_name,
      domain: anomaly.domain,
      location: anomaly.location,
    },
    magnitude: magnitude * confidence,
    confidence: confidence * 0.5, // Reduce confidence for fallback
    direction,
    thesis: `Automated signal: ${getAnomalySeverity(magnitude)} anomaly detected in ${anomaly.domain} domain. Manual analysis recommended.`,
    analysis_id: `fallback-${Date.now()}`,
    severity: getAnomalySeverity(magnitude),
    economic_impact: "Unable to estimate",
    top_recommendation: "Conduct manual review",
  };
}

/**
 * Get risk multiplier based on risk assessment
 */
function getRiskMultiplier(risk: MarketAnalysisResponse['risk_assessment']): number {
  const riskLevels = {
    low: 1.2,
    medium: 1.0,
    high: 0.8,
  };
  
  // Average the risk factors
  const operational = riskLevels[risk.operational_risk.level];
  const market = riskLevels[risk.market_risk.level];
  const geopolitical = riskLevels[risk.geopolitical_risk.level];
  
  return (operational + market + geopolitical) / 3;
}

/**
 * Create investment thesis from analysis
 */
function createInvestmentThesis(
  anomaly: any, 
  analysis: MarketAnalysisResponse, 
  direction: string
): string {
  const { executive_summary, recommendations, economic_impact } = analysis;
  
  let thesis = executive_summary + " ";
  
  // Add directional recommendation
  if (direction === "long") {
    thesis += `Bullish signal driven by ${analysis.market_signals.bullish_indicators[0] || 'positive indicators'}. `;
  } else if (direction === "short") {
    thesis += `Bearish signal driven by ${analysis.market_signals.bearish_indicators[0] || 'negative indicators'}. `;
  } else {
    thesis += `Neutral stance recommended due to mixed signals. `;
  }
  
  // Add economic impact
  thesis += `Expected ${economic_impact.immediate.magnitude} immediate impact with ${economic_impact.immediate.price_impact.direction} price pressure. `;
  
  // Add top recommendation
  if (recommendations.immediate_actions.length > 0) {
    thesis += recommendations.immediate_actions[0].rationale;
  }
  
  return thesis;
}

/**
 * Get anomaly severity classification
 */
function getAnomalySeverity(magnitude: number): string {
  if (magnitude >= 0.8) return "critical";
  if (magnitude >= 0.6) return "high";
  if (magnitude >= 0.4) return "moderate";
  return "low";
}

/**
 * Generate summary of signal generation results
 */
function generateSummary(signals: any[], analyses: MarketAnalysisResponse[]) {
  const longSignals = signals.filter(s => s.direction === "long").length;
  const shortSignals = signals.filter(s => s.direction === "short").length;
  const neutralSignals = signals.filter(s => s.direction === "neutral").length;
  
  const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
  const avgMagnitude = signals.reduce((sum, s) => sum + s.magnitude, 0) / signals.length;
  
  const criticalCount = analyses.filter(a => a.anomaly_assessment.severity === "critical").length;
  const highCount = analyses.filter(a => a.anomaly_assessment.severity === "high").length;
  
  return {
    total_signals: signals.length,
    directional_breakdown: {
      long: longSignals,
      short: shortSignals,
      neutral: neutralSignals,
    },
    average_confidence: avgConfidence,
    average_magnitude: avgMagnitude,
    severity_breakdown: {
      critical: criticalCount,
      high: highCount,
      moderate: analyses.length - criticalCount - highCount,
    },
    market_outlook: determineMarketOutlook(longSignals, shortSignals, avgConfidence),
  };
}

/**
 * Determine overall market outlook
 */
function determineMarketOutlook(
  longCount: number, 
  shortCount: number, 
  avgConfidence: number
): string {
  const ratio = longCount / (shortCount || 1);
  
  if (ratio > 2 && avgConfidence > 0.6) {
    return "Strongly Bullish";
  } else if (ratio > 1.5 && avgConfidence > 0.5) {
    return "Bullish";
  } else if (ratio < 0.5 && avgConfidence > 0.6) {
    return "Strongly Bearish";
  } else if (ratio < 0.67 && avgConfidence > 0.5) {
    return "Bearish";
  } else {
    return "Neutral/Mixed";
  }
}

/**
 * Store market analysis in database (internal mutation)
 */
export const storeAnalysis = mutation({
  args: {
    queryId: v.optional(v.id("queries")),
    analysis: v.any(),
    request: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Store the analysis for future reference
    // This is a placeholder - you may want to create a proper analyses table
    console.log("Storing analysis:", args.analysis.analysis_id);
    // Implementation depends on your database schema
  },
});
