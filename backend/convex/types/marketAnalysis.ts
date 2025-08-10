/**
 * TypeScript interfaces for GPT-5 Market Analysis Response
 * Defines the structured JSON output from the macro/market analyst AI
 */

export interface MarketAnalysisResponse {
  analysis_id: string;
  timestamp: string; // ISO 8601
  anomaly_assessment: AnomalyAssessment;
  economic_impact: EconomicImpact;
  risk_assessment: RiskAssessment;
  recommendations: Recommendations;
  data_quality: DataQuality;
  market_signals: MarketSignals;
  comparable_events: ComparableEvent[];
  executive_summary: string;
  detailed_narrative: string;
  metadata: AnalysisMetadata;
}

export interface AnomalyAssessment {
  severity: 'low' | 'moderate' | 'high' | 'critical';
  confidence: number; // 0.0-1.0
  type: string;
  description: string;
}

export interface EconomicImpact {
  immediate: {
    magnitude: string; // e.g., "$1M-$5M"
    affected_markets: string[];
    price_impact: {
      commodity: string;
      direction: 'up' | 'down' | 'neutral';
      percentage: string; // e.g., "2-5%"
    };
  };
  medium_term: {
    duration: string;
    cascading_effects: string[];
    market_adjustments: string[];
  };
  long_term: {
    structural_changes: string[];
    investment_implications: string[];
  };
}

export interface RiskAssessment {
  operational_risk: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };
  market_risk: {
    level: 'low' | 'medium' | 'high';
    volatility_forecast: string;
  };
  geopolitical_risk: {
    level: 'low' | 'medium' | 'high';
    considerations: string[];
  };
}

export interface Recommendations {
  immediate_actions: {
    action: string;
    priority: 'high' | 'medium' | 'low';
    rationale: string;
  }[];
  monitoring_priorities: string[];
  hedging_strategies: string[];
  investment_opportunities: {
    opportunity: string;
    timeframe: string;
    risk_reward: string;
  }[];
}

export interface DataQuality {
  completeness: number; // 0.0-1.0
  reliability: number; // 0.0-1.0
  limitations: string[];
  additional_data_needs: string[];
}

export interface MarketSignals {
  bullish_indicators: string[];
  bearish_indicators: string[];
  neutral_factors: string[];
  key_watch_points: string[];
}

export interface ComparableEvent {
  event: string;
  date: string;
  similarity_score: number; // 0.0-1.0
  market_outcome: string;
  lessons_learned: string;
}

export interface AnalysisMetadata {
  aoi_id: string;
  domain: 'port' | 'farm' | 'mine' | 'energy';
  geographic_region: string;
  analysis_version: string;
  model_confidence: number; // 0.0-1.0
  processing_time_ms: number;
}

/**
 * Input structure for requesting market analysis
 */
export interface MarketAnalysisRequest {
  aoi_id: string;
  domain: 'port' | 'farm' | 'mine' | 'energy';
  anomaly_data: {
    magnitude: number;
    confidence: number;
    historical_baseline: number;
    detection_timestamp: string;
    instrument_quality?: number;
  };
  embedding_data?: {
    current: number[];
    baseline: number[];
    weighted_magnitude?: number;
  };
  context?: {
    geographic_region: string;
    recent_events?: string[];
    market_conditions?: string[];
    seasonal_factors?: string[];
  };
}

/**
 * Summary structure for quick display
 */
export interface MarketAnalysisSummary {
  analysis_id: string;
  timestamp: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  executive_summary: string;
  top_recommendation: string;
  economic_impact_range: string;
  confidence: number;
}
