import type { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import fs from "fs";

// GET /api/aois?q=term&type=port|farm|mine|energy
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const dataPath = path.resolve(process.cwd(), "..", "data", "aois.json");
    const raw = fs.readFileSync(dataPath, "utf-8");
    const aois = JSON.parse(raw) as Array<{
      id: string;
      name: string;
      type: "port" | "farm" | "mine" | "energy";
      bbox: [number, number, number, number];
      description?: string;
    }>;

    const { q, type } = req.query as { q?: string; type?: string };

    let out = aois;

    if (type && ["port", "farm", "mine", "energy"].includes(type)) {
      out = out.filter((a) => a.type === type);
    }

    if (q && q.trim().length > 0) {
      const term = q.trim().toLowerCase();
      out = out.filter(
        (a) =>
          a.name.toLowerCase().includes(term) ||
          a.id.toLowerCase().includes(term) ||
          (a.description?.toLowerCase().includes(term) ?? false)
      );
    }

    res.setHeader("Cache-Control", "public, max-age=60");
    return res.status(200).json(out);
  } catch (e) {
    const error = e instanceof Error ? e.message : "Failed to load AOIs";
    return res.status(500).json({ error });
  }
}

