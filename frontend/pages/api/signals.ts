import type { NextApiRequest, NextApiResponse } from "next";

export interface Signal {
  id: string;
  instrument: string;
  direction: "long" | "short" | "neutral";
  confidence: number; // 0-1 scale
  rationale: string;
  timestamp: string;
  aoiId?: string;
  aoiName?: string;
  sector?: string;
}

// Mock GPT-5 signals data - in production, this would come from your backend/database
const mockSignals: Signal[] = [
  {
    id: "sig_001",
    instrument: "CL",
    direction: "long",
    confidence: 0.85,
    rationale: "Detected supply disruption at major Middle Eastern refineries. Satellite imagery shows reduced tanker traffic at key ports. Historical patterns suggest 15-20% price increase likely.",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    aoiId: "aoi_energy_001",
    aoiName: "Ras Tanura Terminal",
    sector: "energy"
  },
  {
    id: "sig_002",
    instrument: "CORN",
    direction: "short",
    confidence: 0.72,
    rationale: "Favorable weather patterns detected across US Midwest corn belt. NDVI analysis shows above-average crop health. Expecting bumper harvest leading to oversupply.",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    aoiId: "aoi_farm_002",
    aoiName: "Iowa Corn Belt",
    sector: "agriculture"
  },
  {
    id: "sig_003",
    instrument: "HG",
    direction: "long",
    confidence: 0.91,
    rationale: "Major copper mine in Chile showing operational disruptions. Reduced truck movements detected. Labor strike confirmed via news sentiment analysis. Supply shortage imminent.",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    aoiId: "aoi_mine_003",
    aoiName: "Escondida Mine",
    sector: "mining"
  },
  {
    id: "sig_004",
    instrument: "WEAT",
    direction: "long",
    confidence: 0.68,
    rationale: "Drought conditions intensifying in Australian wheat regions. Soil moisture levels 40% below seasonal average. Yield projections declining.",
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    aoiId: "aoi_farm_004",
    aoiName: "Murray-Darling Basin",
    sector: "agriculture"
  },
  {
    id: "sig_005",
    instrument: "NG",
    direction: "short",
    confidence: 0.79,
    rationale: "Unseasonably warm weather forecast for Northeast US. Heating demand expected to drop 25% below normal. Storage levels already at 5-year highs.",
    timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    aoiId: "aoi_energy_005",
    aoiName: "Henry Hub",
    sector: "energy"
  },
  {
    id: "sig_006",
    instrument: "SOYB",
    direction: "neutral",
    confidence: 0.55,
    rationale: "Mixed signals from Brazilian soy regions. While planting progress is ahead of schedule, La Niña concerns persist. Market likely to remain range-bound.",
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    aoiId: "aoi_farm_006",
    aoiName: "Mato Grosso",
    sector: "agriculture"
  },
  {
    id: "sig_007",
    instrument: "GC",
    direction: "long",
    confidence: 0.83,
    rationale: "Geopolitical tensions escalating. Central bank gold purchases accelerating. Safe haven demand surge expected as uncertainty increases.",
    timestamp: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
    aoiId: "aoi_mine_007",
    aoiName: "Global Gold Markets",
    sector: "mining"
  },
  {
    id: "sig_008",
    instrument: "KC",
    direction: "long",
    confidence: 0.77,
    rationale: "Frost damage confirmed in Brazilian coffee regions. Satellite thermal imaging shows 30% of arabica crop affected. Price spike anticipated.",
    timestamp: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(),
    aoiId: "aoi_farm_008",
    aoiName: "Minas Gerais Coffee Belt",
    sector: "agriculture"
  }
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Signal[] | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Filter by query parameters if provided
    let signals = [...mockSignals];
    
    const { sector, direction, minConfidence, aoiId, limit } = req.query;
    
    if (sector && typeof sector === "string") {
      signals = signals.filter(s => s.sector === sector);
    }
    
    if (direction && typeof direction === "string") {
      signals = signals.filter(s => s.direction === direction);
    }
    
    if (minConfidence && typeof minConfidence === "string") {
      const threshold = parseFloat(minConfidence);
      if (!isNaN(threshold)) {
        signals = signals.filter(s => s.confidence >= threshold);
      }
    }
    
    if (aoiId && typeof aoiId === "string") {
      signals = signals.filter(s => s.aoiId === aoiId);
    }
    
    // Sort by timestamp (most recent first)
    signals.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Apply limit if specified
    if (limit && typeof limit === "string") {
      const maxResults = parseInt(limit);
      if (!isNaN(maxResults) && maxResults > 0) {
        signals = signals.slice(0, maxResults);
      }
    }
    
    res.status(200).json(signals);
  } catch (error) {
    console.error("Error fetching signals:", error);
    res.status(500).json({ error: "Failed to fetch signals" });
  }
}
