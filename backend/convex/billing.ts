import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getProfile = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("profiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();
  },
});

export const upsertProfile = mutation({
  args: {
    userId: v.string(),
    plan: v.union(v.literal("free"), v.literal("pro")),
    stripeCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, { userId, plan, stripeCustomerId }) => {
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();
    const now = Date.now();
    if (!existing) {
      await ctx.db.insert("profiles", { userId, plan, stripeCustomerId, updatedAt: now });
    } else {
      await ctx.db.patch(existing._id, { plan, stripeCustomerId, updatedAt: now });
    }
    return { ok: true };
  },
});

export const checkAndCountUsage = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .unique();
    const plan = profile?.plan ?? "free";
    if (plan === "pro") return { allowed: true };

    const today = new Date().toISOString().slice(0, 10);
    const row = await ctx.db
      .query("usage")
      .withIndex("by_user_and_date", q => q.eq("userId", userId).eq("date", today))
      .unique();
    const current = row?.count ?? 0;
    if (current >= 5) return { allowed: false };

    if (!row) {
      await ctx.db.insert("usage", { userId, date: today, count: 1 });
    } else {
      await ctx.db.patch(row._id, { count: current + 1 });
    }
    return { allowed: true };
  },
});
