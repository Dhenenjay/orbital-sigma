import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const saveSignals = mutation({
  args: {
    queryId: v.id("queries"),
    signals: v.array(
      v.object({
        aoi: v.any(),
        magnitude: v.number(),
        confidence: v.number(),
        direction: v.string(),
        thesis: v.string(),
      })
    ),
    replaceExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, { queryId, signals, replaceExisting }) => {
    // Ensure the query exists
    const q = await ctx.db.get(queryId);
    if (!q) throw new Error("Query not found");

    if (replaceExisting) {
      // Remove existing signals for this query to replace with new set
      const existing = await ctx.db
        .query("signals")
        .withIndex("by_queryId", q => q.eq("queryId", queryId))
        .collect();
      await Promise.all(existing.map(doc => ctx.db.delete(doc._id)));
    }

    const ids = [] as Array<string>;
    for (const s of signals) {
      const id = await ctx.db.insert("signals", {
        queryId,
        aoi: s.aoi,
        magnitude: s.magnitude,
        confidence: s.confidence,
        direction: s.direction,
        thesis: s.thesis,
      });
      ids.push(id);
    }

    return { insertedCount: ids.length, ids } as const;
  },
});

export const getSignalsByQuery = query({
  args: { queryId: v.id("queries") },
  handler: async (ctx, { queryId }) => {
    const rows = await ctx.db
      .query("signals")
      .withIndex("by_queryId", q => q.eq("queryId", queryId))
      .collect();
    return rows;
  },
});
