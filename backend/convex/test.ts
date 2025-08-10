import { action } from "./_generated/server";
import { v } from "convex/values";

// Runs a CRUD smoke test for all tables. Safe to run in dev; cleans up after itself.
export const runCrudSmokeTests = action({
  args: { seed: v.optional(v.string()) },
  handler: async (ctx, { seed }) => {
    const suffix = seed ?? Math.random().toString(36).slice(2, 8);

    const createdIds: Array<{ table: string; id: any }> = [];

    const now = Date.now();
    const today = new Date().toISOString().slice(0, 10);

    const results: Record<string, any> = {};

    try {
      // users: create, read by index, update
      const u1 = await ctx.db.insert("users", {
        clerkUserId: `user_${suffix}`,
        email: `user_${suffix}@example.com`,
        plan: "free" as const,
      });
      createdIds.push({ table: "users", id: u1 });

      const uRead = await ctx.db
        .query("users")
        .withIndex("by_clerkUserId", q => q.eq("clerkUserId", `user_${suffix}`))
        .unique();
      if (!uRead) throw new Error("users: read by index failed");

      await ctx.db.patch(uRead._id, { plan: "pro" as const });
      const uUpdated = await ctx.db.get(uRead._id);

      results.users = { created: uRead, updated: uUpdated };

      // profiles: create, read by index, update
      const p1 = await ctx.db.insert("profiles", {
        userId: `user_${suffix}`,
        plan: "free" as const,
        stripeCustomerId: undefined,
        updatedAt: now,
      });
      createdIds.push({ table: "profiles", id: p1 });

      const pRead = await ctx.db
        .query("profiles")
        .withIndex("by_userId", q => q.eq("userId", `user_${suffix}`))
        .unique();
      if (!pRead) throw new Error("profiles: read by index failed");

      await ctx.db.patch(pRead._id, { plan: "pro" as const, updatedAt: now + 1 });
      const pUpdated = await ctx.db.get(pRead._id);

      results.profiles = { created: pRead, updated: pUpdated };

      // usage: create, read by index, update
      const usage1 = await ctx.db.insert("usage", {
        userId: `user_${suffix}`,
        date: today,
        count: 1,
      });
      createdIds.push({ table: "usage", id: usage1 });

      const usageRead = await ctx.db
        .query("usage")
        .withIndex("by_user_and_date", q => q.eq("userId", `user_${suffix}`).eq("date", today))
        .unique();
      if (!usageRead) throw new Error("usage: read by index failed");

      await ctx.db.patch(usageRead._id, { count: usageRead.count + 1 });
      const usageUpdated = await ctx.db.get(usageRead._id);

      results.usage = { created: usageRead, updated: usageUpdated };

      // queries: create, read by index, update
      const q1 = await ctx.db.insert("queries", {
        userId: `user_${suffix}`,
        prompt: "Test prompt",
        params: { k: 1 },
        createdAt: now,
      });
      createdIds.push({ table: "queries", id: q1 });

      const qReadList = await ctx.db
        .query("queries")
        .withIndex("by_userId", q => q.eq("userId", `user_${suffix}`))
        .collect();
      if (!qReadList.length) throw new Error("queries: read by index failed");

      await ctx.db.patch(q1, { prompt: "Updated prompt" });
      const qUpdated = await ctx.db.get(q1);

      results.queries = { created: await ctx.db.get(q1), updated: qUpdated };

      // signals: create, read by index, update
      const s1 = await ctx.db.insert("signals", {
        queryId: q1,
        aoi: { type: "Point", coordinates: [0, 0] },
        magnitude: 0.5,
        confidence: 0.9,
        direction: "increasing",
        thesis: "Signal thesis",
      });
      createdIds.push({ table: "signals", id: s1 });

      const sReadList = await ctx.db
        .query("signals")
        .withIndex("by_queryId", q => q.eq("queryId", q1))
        .collect();
      if (!sReadList.length) throw new Error("signals: read by index failed");

      await ctx.db.patch(s1, { magnitude: 0.7 });
      const sUpdated = await ctx.db.get(s1);

      results.signals = { created: await ctx.db.get(s1), updated: sUpdated };

      return { ok: true as const, results };
    } catch (error: any) {
      return { ok: false as const, error: error?.message ?? String(error), results };
    } finally {
      // Cleanup in reverse order to respect references
      for (const { table, id } of createdIds.reverse()) {
        try {
          await ctx.db.delete(id);
        } catch {
          // ignore cleanup errors
        }
      }
    }
  },
});

