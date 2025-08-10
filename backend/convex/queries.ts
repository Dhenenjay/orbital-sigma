import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const logQueryStart = mutation({
  args: {
    userId: v.string(),
    prompt: v.string(),
    params: v.any(),
  },
  handler: async (ctx, { userId, prompt, params }) => {
    // Resolve plan: prefer users table, fallback to profiles, default to free
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", q => q.eq("clerkUserId", userId))
      .unique();
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();

    const plan: "free" | "pro" = (user?.plan ?? profile?.plan ?? "free") as any;

    if (plan === "free") {
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const usageRow = await ctx.db
        .query("usage")
        .withIndex("by_user_and_date", q => q.eq("userId", userId).eq("date", today))
        .unique();

      const current = usageRow?.count ?? 0;
      if (current >= 5) {
        return { allowed: false as const, reason: "quota_exceeded", plan };
      }

      if (!usageRow) {
        await ctx.db.insert("usage", { userId, date: today, count: 1 });
      } else {
        await ctx.db.patch(usageRow._id, { count: current + 1 });
      }
    }

    const createdAt = Date.now();
    const queryId = await ctx.db.insert("queries", {
      userId,
      prompt,
      params,
      createdAt,
    });

    return { allowed: true as const, plan, queryId };
  },
});

export const getUserQueries = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, limit }) => {
    const rows = await ctx.db
      .query("queries")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .collect();

    // Sort most-recent-first client-side to avoid relying on index ordering
    rows.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    const n = Math.max(1, Math.min(limit ?? 50, 200));
    return rows.slice(0, n);
  },
});
