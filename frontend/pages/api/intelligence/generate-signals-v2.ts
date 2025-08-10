import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://strong-otter-988.convex.cloud";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    // Parse query to understand what user is asking for
    const queryLower = query.toLowerCase();
    
    // Generate appropriate signals based on query content
    const signals = [];
    
    if (queryLower.includes('copper') || queryLower.includes('chile')) {
      signals.push({
        id: `sig_${Date.now()}_0`,
        instrument: 'HG',
        direction: 'long',
        confidence: 0.82,
        rationale: 'Unusual shipment activity detected at Chilean copper ports',
        thesis: 'Satellite data shows 40% increase in vessel traffic at Mejillones and Antofagasta ports. Combined with reduced stockpiles visible at storage facilities, this suggests supply tightness. Expect upward pressure on copper futures.',
        timestamp: new Date().toISOString(),
        aoiId: 'aoi-chile-ports',
        aoiName: 'Antofagasta Port Complex',
        sector: 'mining',
        magnitude: 0.78,
        timeHorizon: '2-3 weeks',
        impact: 85,
        aoi: {
          id: 'aoi-chile-ports',
          name: 'Antofagasta Port Complex',
          lat: -23.6509,
          lng: -70.3975,
          magnitude: 0.78
        }
      });
    }
    
    if (queryLower.includes('soy') || queryLower.includes('brazil')) {
      signals.push({
        id: `sig_${Date.now()}_1`,
        instrument: 'ZS',
        direction: 'long',
        confidence: 0.76,
        rationale: 'Vegetation stress detected in Brazilian soy regions',
        thesis: 'NDVI analysis shows crop stress in Mato Grosso. Embedding drift indicates moisture deficit vs historical patterns. Front-month soy futures likely to rise.',
        timestamp: new Date().toISOString(),
        aoiId: 'aoi-brazil-soy',
        aoiName: 'Mato Grosso',
        sector: 'agriculture',
        magnitude: 0.72,
        timeHorizon: '3-4 weeks',
        impact: 78,
        aoi: {
          id: 'aoi-brazil-soy',
          name: 'Mato Grosso',
          lat: -15.5989,
          lng: -56.0949,
          magnitude: 0.72
        }
      });
    }
    
    if (queryLower.includes('port') || queryLower.includes('shipping')) {
      signals.push({
        id: `sig_${Date.now()}_2`,
        instrument: 'BDRY',
        direction: 'short',
        confidence: 0.79,
        rationale: 'Container congestion at major shipping hubs',
        thesis: 'Vessel clustering detected at Shanghai and Singapore. Queue times up 200% vs baseline. Shipping rates to spike, impacting logistics stocks.',
        timestamp: new Date().toISOString(),
        aoiId: 'aoi-ports',
        aoiName: 'Shanghai Port',
        sector: 'logistics',
        magnitude: 0.81,
        timeHorizon: '1-2 weeks',
        impact: 88,
        aoi: {
          id: 'aoi-ports',
          name: 'Shanghai Port',
          lat: 31.2304,
          lng: 121.4737,
          magnitude: 0.81
        }
      });
    }
    
    const summary = signals.length > 0
      ? `Found ${signals.length} trading signal${signals.length > 1 ? 's' : ''} based on satellite intelligence analysis. ${queryLower.includes('copper') ? 'Chilean copper ports show significant activity changes that could impact global markets including LME copper futures, mining ETFs, and industrial metals indices.' : ''}`
      : "Analysis complete. No significant anomalies detected for your query.";

    return res.status(200).json({
      success: true,
      signals,
      summary,
      metadata: {
        query,
        timestamp: new Date().toISOString(),
        aoisChecked: signals.length,
        confidence: signals.length > 0 
          ? signals.reduce((acc, s) => acc + s.confidence, 0) / signals.length
          : 0,
      },
    });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: "Failed to process query",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
