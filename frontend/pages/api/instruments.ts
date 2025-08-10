import type { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import fs from "fs";

type AoiType = "port" | "farm" | "mine" | "energy";

// GET /api/instruments?type=port|farm|mine|energy
interface InstrumentResponse {
  futures?: { symbol: string; name: string }[];
  etfs?: { symbol: string; name: string }[];
  fx?: { pair: string; name: string }[];
}

interface ErrorResponse {
  error: string;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<InstrumentResponse | ErrorResponse>
) {
  if (req.method !== "GET") return res.status(405).end();

  const { type } = req.query as { type?: string };
  if (!type || !["port", "farm", "mine", "energy"].includes(type)) {
    return res.status(400).json({ error: "Invalid or missing 'type' query param" });
  }

  try {
    const dataPath = path.resolve(process.cwd(), "..", "data", "instrumentMap.json");
    const raw = fs.readFileSync(dataPath, "utf-8");
    const map = JSON.parse(raw) as Record<AoiType, InstrumentResponse>;

    const payload = map[type as AoiType];
    if (!payload) return res.status(404).json({ error: "Type not found" });

    res.setHeader("Cache-Control", "public, max-age=300");
    return res.status(200).json(payload);
  } catch (e) {
    const error = e instanceof Error ? e.message : "Failed to load instrument map";
    return res.status(500).json({ error });
  }
}

