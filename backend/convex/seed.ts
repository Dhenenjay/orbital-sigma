import { httpAction } from "./_generated/server";
import { v } from "convex/values";

// Simple shared secret auth via header for seeding. In production, scope to protected env.
const HEADER = "x-seed-secret";

export const seedCatalog = httpAction(async (ctx, req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const secret = process.env.SEED_SECRET;
  if (!secret) return new Response("Missing SEED_SECRET", { status: 500 });
  const provided = req.headers.get(HEADER);
  if (provided !== secret) return new Response("Unauthorized", { status: 401 });

  try {
    const body = await req.json();
    const { aois, instrumentMap } = body as {
      aois: Array<{ id: string; name: string; type: "port"|"farm"|"mine"|"energy"; bbox: number[]; description?: string }>; 
      instrumentMap: Record<string, { futures: any[]; etfs: any[]; fx: any[] }>;
    };

    // Upsert AOIs
    for (const a of aois) {
      const existing = await ctx.db
        .query("aoi_catalog")
        .withIndex("by_slug", q => q.eq("slug", a.id))
        .unique();
      if (!existing) {
        await ctx.db.insert("aoi_catalog", {
          slug: a.id,
          name: a.name,
          type: a.type,
          bbox: a.bbox,
          description: a.description,
        });
      } else {
        await ctx.db.patch(existing._id, {
          name: a.name,
          type: a.type,
          bbox: a.bbox,
          description: a.description,
        });
      }
    }

    // Upsert instrument map (one per type)
    for (const t of ["port", "farm", "mine", "energy"] as const) {
      const entry = instrumentMap[t];
      if (!entry) continue;
      const existing = await ctx.db
        .query("instrument_map")
        .withIndex("by_type", q => q.eq("type", t))
        .unique();
      if (!existing) {
        await ctx.db.insert("instrument_map", {
          type: t,
          futures: entry.futures ?? [],
          etfs: entry.etfs ?? [],
          fx: entry.fx ?? [],
        });
      } else {
        await ctx.db.patch(existing._id, {
          futures: entry.futures ?? [],
          etfs: entry.etfs ?? [],
          fx: entry.fx ?? [],
        });
      }
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }), { status: 500, headers: { "content-type": "application/json" } });
  }
});

