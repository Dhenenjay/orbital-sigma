import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const upsertUser = mutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    plan: v.union(v.literal("free"), v.literal("pro")),
  },
  handler: async (ctx, { clerkUserId, email, plan }) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", q => q.eq("clerkUserId", clerkUserId))
      .unique();

    if (!existing) {
      await ctx.db.insert("users", { clerkUserId, email, plan });
    } else {
      await ctx.db.patch(existing._id, { email, plan });
    }

    return { ok: true } as const;
  },
});

