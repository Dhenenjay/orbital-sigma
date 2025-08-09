import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  profiles: defineTable({
    userId: v.string(),
    plan: v.union(v.literal("free"), v.literal("pro")),
    stripeCustomerId: v.optional(v.string()),
    updatedAt: v.number(), // epoch ms
  }).index("by_userId", ["userId"]),

  usage: defineTable({
    userId: v.string(),
    date: v.string(), // YYYY-MM-DD
    count: v.number(),
  })
    .index("by_user_and_date", ["userId", "date"]) 
    .index("by_user", ["userId"]),
});
