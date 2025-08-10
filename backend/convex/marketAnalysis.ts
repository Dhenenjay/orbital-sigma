/**
 * Market Analysis using OpenAI GPT for anomaly interpretation
 */

import { v } from "convex/values";
import { action } from "./_generated/server";
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
 * Analyze anomaly data and generate market intelligence
 */
export const analyzeAnomaly = action({
  args: {
    aoi_id: v.string(),
    domain: v.union(
      v.literal("port"),
      v.literal("farm"),
      v.literal("mine"),
      v.literal("energy")
    ),
    anomaly_data: v.object({
      magnitude: v.number(),
      confidence: v.number(),
      historical_baseline: v.number(),
      detection_timestamp: v.string(),
      instrument_quality: v.optional(v.number()),
    }),
    embedding_data: v.optional(v.object({
      current: v.array(v.number()),
      baseline: v.array(v.number()),
      weighted_magnitude: v.optional(v.number()),
    })),
    context: v.optional(v.object({
      geographic_region: v.string(),
      recent_events: v.optional(v.array(v.string())),
      market_conditions: v.optional(v.array(v.string())),
      seasonal_factors: v.optional(v.array(v.string())),
    })),
  },
  handler: async (ctx, args): Promise<MarketAnalysisResponse> => {
    const startTime = Date.now();
    
    // Prepare the user prompt with anomaly data
    const userPrompt = constructUserPrompt(args as MarketAnalysisRequest);
    
    try {
      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview", // Use GPT-4 until GPT-5 is available
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // Lower temperature for more consistent analysis
        max_tokens: 4000,
      });
      
      const responseText = completion.choices[0].message.content;
      if (!responseText) {
        throw new Error("No response from OpenAI");
      }
      
      // Parse and validate the JSON response
      const analysis: MarketAnalysisResponse = JSON.parse(responseText);
      
      // Add processing time to metadata
      analysis.metadata.processing_time_ms = Date.now() - startTime;
      
      // Store the analysis in the database
      await ctx.runMutation("internal:marketAnalysis:storeAnalysis", {
        analysis,
        request: args,
      });
      
      return analysis;
      
    } catch (error) {
      console.error("Error in market analysis:", error);
      
      // Return a fallback analysis
      return generateFallbackAnalysis(
        args as MarketAnalysisRequest, 
        Date.now() - startTime,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  },
});

/**
 * Get a summary of recent analyses for an AOI
 */
export const getAnalysisSummaries = action({
  args: {
    aoi_id: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<MarketAnalysisSummary[]> => {
    const analyses = await ctx.runQuery("internal:marketAnalysis:getRecentAnalyses", {
      aoi_id: args.aoi_id,
      limit: args.limit || 10,
    });
    
    return analyses.map(analysis => ({
      analysis_id: analysis.analysis_id,
      timestamp: analysis.timestamp,
      severity: analysis.anomaly_assessment.severity,
      executive_summary: analysis.executive_summary,
      top_recommendation: analysis.recommendations.immediate_actions[0]?.action || 'Monitor situation',
      economic_impact_range: analysis.economic_impact.immediate.magnitude,
      confidence: analysis.anomaly_assessment.confidence,
    }));
  },
});

/**
 * Construct a detailed user prompt from the anomaly data
 */
function constructUserPrompt(request: MarketAnalysisRequest): string {
  const { aoi_id, domain, anomaly_data, embedding_data, context } = request;
  
  let prompt = `Analyze the following satellite imagery anomaly and provide comprehensive market intelligence:\n\n`;
  
  // Basic anomaly information
  prompt += `## Anomaly Details\n`;
  prompt += `- AOI ID: ${aoi_id}\n`;
  prompt += `- Domain: ${domain}\n`;
  prompt += `- Detection Time: ${anomaly_data.detection_timestamp}\n`;
  prompt += `- Anomaly Magnitude: ${anomaly_data.magnitude.toFixed(4)}\n`;
  prompt += `- Confidence Score: ${(anomaly_data.confidence * 100).toFixed(1)}%\n`;
  prompt += `- Historical Baseline: ${anomaly_data.historical_baseline.toFixed(4)}\n`;
  prompt += `- Change from Baseline: ${((anomaly_data.magnitude - anomaly_data.historical_baseline) / anomaly_data.historical_baseline * 100).toFixed(1)}%\n`;
  
  if (anomaly_data.instrument_quality !== undefined) {
    prompt += `- Instrument Quality: ${(anomaly_data.instrument_quality * 100).toFixed(1)}%\n`;
  }
  
  // Embedding analysis if available
  if (embedding_data) {
    prompt += `\n## Embedding Analysis\n`;
    if (embedding_data.weighted_magnitude !== undefined) {
      prompt += `- Weighted Magnitude: ${embedding_data.weighted_magnitude.toFixed(4)}\n`;
    }
    prompt += `- Embedding Dimensions: ${embedding_data.current.length}\n`;
    
    // Calculate some basic statistics
    const maxChange = Math.max(...embedding_data.current.map((val, i) => 
      Math.abs(val - (embedding_data.baseline[i] || 0))
    ));
    prompt += `- Maximum Dimensional Change: ${maxChange.toFixed(4)}\n`;
  }
  
  // Context information
  if (context) {
    prompt += `\n## Contextual Information\n`;
    prompt += `- Geographic Region: ${context.geographic_region}\n`;
    
    if (context.recent_events && context.recent_events.length > 0) {
      prompt += `- Recent Events: ${context.recent_events.join(', ')}\n`;
    }
    
    if (context.market_conditions && context.market_conditions.length > 0) {
      prompt += `- Current Market Conditions: ${context.market_conditions.join(', ')}\n`;
    }
    
    if (context.seasonal_factors && context.seasonal_factors.length > 0) {
      prompt += `- Seasonal Factors: ${context.seasonal_factors.join(', ')}\n`;
    }
  }
  
  // Analysis request
  prompt += `\n## Analysis Required\n`;
  prompt += `Please provide a comprehensive market analysis considering:\n`;
  prompt += `1. The severity and nature of the detected anomaly\n`;
  prompt += `2. Immediate and long-term economic implications\n`;
  prompt += `3. Risk assessment across operational, market, and geopolitical dimensions\n`;
  prompt += `4. Actionable recommendations for market participants\n`;
  prompt += `5. Historical comparisons and pattern recognition\n`;
  prompt += `\nReturn the analysis as structured JSON following the defined schema.`;
  
  return prompt;
}

/**
 * Generate a fallback analysis when OpenAI API fails
 */
function generateFallbackAnalysis(
  request: MarketAnalysisRequest,
  processingTime: number,
  errorMessage: string
): MarketAnalysisResponse {
  const severity = request.anomaly_data.magnitude > 0.7 ? 'high' : 
                   request.anomaly_data.magnitude > 0.4 ? 'moderate' : 'low';
  
  return {
    analysis_id: `fallback-${Date.now()}`,
    timestamp: new Date().toISOString(),
    anomaly_assessment: {
      severity,
      confidence: 0.3,
      type: 'automated-detection',
      description: `Automated anomaly detection in ${request.domain} domain. Manual review recommended due to: ${errorMessage}`,
    },
    economic_impact: {
      immediate: {
        magnitude: 'Unable to estimate',
        affected_markets: [request.domain],
        price_impact: {
          commodity: 'Unknown',
          direction: 'neutral',
          percentage: 'N/A',
        },
      },
      medium_term: {
        duration: 'Unknown',
        cascading_effects: [],
        market_adjustments: [],
      },
      long_term: {
        structural_changes: [],
        investment_implications: [],
      },
    },
    risk_assessment: {
      operational_risk: {
        level: 'medium',
        factors: ['Data processing error', 'Requires manual verification'],
      },
      market_risk: {
        level: 'low',
        volatility_forecast: 'Unable to forecast',
      },
      geopolitical_risk: {
        level: 'low',
        considerations: [],
      },
    },
    recommendations: {
      immediate_actions: [
        {
          action: 'Conduct manual review of anomaly data',
          priority: 'high',
          rationale: 'Automated analysis unavailable',
        },
      ],
      monitoring_priorities: ['System status', 'Data quality'],
      hedging_strategies: [],
      investment_opportunities: [],
    },
    data_quality: {
      completeness: 0.5,
      reliability: 0.3,
      limitations: ['API error', errorMessage],
      additional_data_needs: ['Manual verification', 'Alternative data sources'],
    },
    market_signals: {
      bullish_indicators: [],
      bearish_indicators: [],
      neutral_factors: ['Insufficient data for analysis'],
      key_watch_points: ['System recovery', 'Data availability'],
    },
    comparable_events: [],
    executive_summary: `Automated fallback analysis for ${request.domain} anomaly. Manual review required.`,
    detailed_narrative: `An anomaly was detected in the ${request.domain} domain with magnitude ${request.anomaly_data.magnitude.toFixed(2)}. Due to technical issues (${errorMessage}), a comprehensive market analysis could not be completed. Manual review is strongly recommended.`,
    metadata: {
      aoi_id: request.aoi_id,
      domain: request.domain,
      geographic_region: request.context?.geographic_region || 'Unknown',
      analysis_version: 'fallback-1.0',
      model_confidence: 0.3,
      processing_time_ms: processingTime,
    },
  };
}
