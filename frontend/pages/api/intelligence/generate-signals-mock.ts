import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";

interface GenerateSignalsRequest {
  query: string;
  aoiIds?: string[];
  timeWindow?: string;
  maxSignals?: number;
}

interface Signal {
  id: string;
  instrument: string;
  direction: "long" | "short" | "neutral";
  confidence: number;
  rationale: string;
  timestamp: string;
  aoiId: string;
  aoiName: string;
  sector: string;
  magnitude: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Authenticate user
  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { query } = req.body as GenerateSignalsRequest;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    console.log(`Processing intelligence query for user ${userId}: ${query}`);

    // Parse query locally for now
    const queryLower = query.toLowerCase();
    const intent = {
      locations: queryLower.includes('brazil') ? ['Brazil'] : 
                 queryLower.includes('china') ? ['China'] : ['Global'],
      commodities: queryLower.includes('soy') ? ['soybeans'] :
                   queryLower.includes('copper') ? ['copper'] :
                   queryLower.includes('oil') ? ['oil'] : ['general'],
      timeframe: '7d',
      intent: 'analyze'
    };

    // Generate mock signals based on query
    const mockSignals = [];
    
    if (queryLower.includes('soy') || queryLower.includes('brazil')) {
      mockSignals.push({
        id: `sig_${Date.now()}_0`,
        instrument: 'ZS',
        direction: 'long' as const,
        confidence: 0.78,
        rationale: 'Significant vegetation change detected in key production areas',
        thesis: 'NDVI and embedding drift indicate crop stress vs seasonality. If sustained, expect upward pressure on front-month soy futures.',
        timestamp: new Date().toISOString(),
        aoiId: 'aoi-brazil-1',
        aoiName: 'Mato Grosso',
        sector: 'agriculture',
        magnitude: 0.74,
        timeHorizon: '2-4 weeks',
        impact: 82
      });
    }
    
    if (queryLower.includes('port') || queryLower.includes('shipping')) {
      mockSignals.push({
        id: `sig_${Date.now()}_1`,
        instrument: 'BDRY',
        direction: 'short' as const,
        confidence: 0.85,
        rationale: 'Unusual vessel congestion patterns detected at major shipping hubs',
        thesis: 'Container throughput anomalies suggest supply chain disruption. Shipping rates likely to spike, impacting retail margins.',
        timestamp: new Date().toISOString(),
        aoiId: 'aoi-shanghai-1',
        aoiName: 'Shanghai Port',
        sector: 'logistics',
        magnitude: 0.81,
        timeHorizon: '1-2 weeks',
        impact: 88
      });
    }
    
    if (queryLower.includes('copper') || queryLower.includes('mine')) {
      mockSignals.push({
        id: `sig_${Date.now()}_2`,
        instrument: 'HG',
        direction: 'long' as const,
        confidence: 0.72,
        rationale: 'Operational disruptions detected at major copper mining sites',
        thesis: 'Reduced truck movements and processing activity indicate production constraints. Supply tightness to support prices.',
        timestamp: new Date().toISOString(),
        aoiId: 'aoi-chile-1',
        aoiName: 'Escondida Mine',
        sector: 'mining',
        magnitude: 0.68,
        timeHorizon: '3-6 weeks',
        impact: 75
      });
    }
    
    // If no specific signals, return a general one
    if (mockSignals.length === 0) {
      mockSignals.push({
        id: `sig_${Date.now()}_0`,
        instrument: 'SPY',
        direction: 'neutral' as const,
        confidence: 0.65,
        rationale: 'General market analysis based on satellite data',
        thesis: 'No significant anomalies detected in monitored regions. Market conditions appear stable.',
        timestamp: new Date().toISOString(),
        aoiId: 'aoi-general-1',
        aoiName: 'Global Overview',
        sector: 'general',
        magnitude: 0.5,
        timeHorizon: '1-2 weeks',
        impact: 50
      });
    }

    const summary = mockSignals.length > 0
      ? `Found ${mockSignals.length} trading signal${mockSignals.length > 1 ? 's' : ''} based on satellite analysis.`
      : "No significant anomalies detected for your query.";

    return res.status(200).json({
      success: true,
      signals: mockSignals,
      summary,
      metadata: {
        query,
        parsedIntent: intent,
        aoisChecked: mockSignals.length,
        anomaliesDetected: mockSignals.length,
        signalsGenerated: mockSignals.length,
        confidence: mockSignals.length > 0 
          ? mockSignals.reduce((acc, s) => acc + s.confidence, 0) / mockSignals.length
          : 0,
        timestamp: new Date().toISOString(),
        processingTime: 250
      },
    });

  } catch (error) {
    console.error("Error generating signals:", error);
    
    return res.status(500).json({
      success: false,
      error: "Failed to generate intelligence signals",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

// Helper functions
function mapCommodityToAoiType(commodity: string): string | null {
  const mapping: Record<string, string> = {
    oil: "energy",
    gas: "energy",
    coal: "energy",
    wheat: "farm",
    corn: "farm",
    soy: "farm",
    rice: "farm",
    copper: "mine",
    gold: "mine",
    iron: "mine",
    lithium: "mine",
  };
  
  const lower = commodity.toLowerCase();
  for (const [key, value] of Object.entries(mapping)) {
    if (lower.includes(key)) return value;
  }
  return null;
}

function mapAoiTypeToDomain(type?: string): string {
  const mapping: Record<string, string> = {
    port: "port",
    farm: "farm",
    mine: "mine",
    energy: "energy",
  };
  return mapping[type || ""] || "port";
}

function mapDomainToSector(domain: string): string {
  const mapping: Record<string, string> = {
    port: "logistics",
    farm: "agriculture",
    mine: "mining",
    energy: "energy",
  };
  return mapping[domain] || "other";
}
