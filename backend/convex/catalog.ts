import { query } from "./_generated/server";
import { v } from "convex/values";

// Public query to retrieve AOIs with optional filtering
export const getAois = query({
  args: {
    type: v.optional(v.union(v.literal("port"), v.literal("farm"), v.literal("mine"), v.literal("energy"))),
    q: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { type, q } = args;
    let rows: any[] = [];
    if (type) {
      rows = await ctx.db
        .query("aoi_catalog")
        .withIndex("by_type", (q) => q.eq("type", type))
        .collect();
    } else {
      rows = await ctx.db.query("aoi_catalog").collect();
    }

    if (q && q.trim().length > 0) {
      const term = q.trim().toLowerCase();
      rows = rows.filter(
        (a) =>
          a.name?.toLowerCase().includes(term) ||
          a.slug?.toLowerCase().includes(term) ||
          (a.description ? a.description.toLowerCase().includes(term) : false)
      );
    }

    // Map to a consistent client payload
    return rows.map((a) => ({
      id: a.slug,
      name: a.name,
      type: a.type,
      bbox: a.bbox,
      description: a.description ?? null,
    }));
  },
});

