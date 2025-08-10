import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    email: v.string(),
    plan: v.union(v.literal("free"), v.literal("pro")),
  }).index("by_clerkUserId", ["clerkUserId"]).index("by_email", ["email"]),

  profiles: defineTable({
    userId: v.string(),
    plan: v.union(v.literal("free"), v.literal("pro")),
    stripeCustomerId: v.optional(v.string()),
    updatedAt: v.number(), // epoch ms
  }).index("by_userId", ["userId"]),

  // Catalog of AOIs for dropdowns/search
  aoi_catalog: defineTable({
    slug: v.string(), // stable id from JSON ("id")
    name: v.string(),
    type: v.union(v.literal("port"), v.literal("farm"), v.literal("mine"), v.literal("energy")),
    bbox: v.array(v.number()), // [minLon, minLat, maxLon, maxLat]
    description: v.optional(v.string()),
  }).index("by_slug", ["slug"]).index("by_type", ["type"]),

  // Mapping from AOI type to market instruments
  instrument_map: defineTable({
    type: v.union(v.literal("port"), v.literal("farm"), v.literal("mine"), v.literal("energy")),
    futures: v.array(v.object({ symbol: v.string(), name: v.string() })),
    etfs: v.array(v.object({ symbol: v.string(), name: v.string() })),
    fx: v.array(v.object({ pair: v.string(), name: v.string() })),
  }).index("by_type", ["type"]),

  queries: defineTable({
    userId: v.string(),
    prompt: v.string(),
    params: v.any(),
    createdAt: v.number(), // epoch ms
  }).index("by_userId", ["userId"]),

  signals: defineTable({
    queryId: v.id("queries"),
    aoi: v.any(),
    magnitude: v.number(),
    confidence: v.number(),
    direction: v.string(),
    thesis: v.string(),
  }).index("by_queryId", ["queryId"]),

  usage: defineTable({
    userId: v.string(),
    date: v.string(), // YYYY-MM-DD
    count: v.number(),
  })
    .index("by_user_and_date", ["userId", "date"]) 
    .index("by_user", ["userId"]),

  // Stored anomaly sets for rerun capability
  anomaly_sets: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    userId: v.string(),
    anomalies: v.array(v.object({
      aoi_id: v.string(),
      aoi_name: v.string(),
      domain: v.union(
        v.literal("port"),
        v.literal("farm"),
        v.literal("mine"),
        v.literal("energy")
      ),
      magnitude: v.number(),
      confidence: v.number(),
      baseline: v.optional(v.number()),
      timestamp: v.string(),
      location: v.optional(v.object({
        lat: v.number(),
        lng: v.number(),
        region: v.optional(v.string()),
      })),
      description: v.optional(v.string()),
    })),
    original_query_id: v.optional(v.id("queries")),
    metadata: v.optional(v.any()),
    created_at: v.optional(v.number()),
    run_count: v.optional(v.number()),
    last_run_at: v.optional(v.number()),
    last_run_results: v.optional(v.any()),
  })
    .index("by_userId", ["userId"])
    .index("by_created_at", ["created_at"]),

  // GPT API usage tracking
  gpt_usage: defineTable({
    userId: v.string(),
    queryId: v.optional(v.id("queries")),
    timestamp: v.number(),
    
    // Model and endpoint info
    model: v.string(),
    endpoint: v.string(),
    purpose: v.string(),
    
    // Token counts
    prompt_tokens: v.number(),
    completion_tokens: v.number(),
    total_tokens: v.number(),
    
    // Costs in USD
    input_cost: v.number(),
    output_cost: v.number(),
    total_cost: v.number(),
    
    // Optional metadata
    anomaly_count: v.optional(v.number()),
    signal_count: v.optional(v.number()),
    error: v.optional(v.string()),
    cache_hit: v.boolean(),
    response_time_ms: v.number(),
  })
    .index("by_user_and_time", ["userId", "timestamp"])
    .index("by_query", ["queryId"]),

  // Daily usage summaries for quick aggregation
  gpt_daily_usage: defineTable({
    userId: v.string(),
    date: v.string(), // YYYY-MM-DD format
    total_calls: v.number(),
    total_tokens: v.number(),
    total_cost: v.number(),
  })
    .index("by_user_and_date", ["userId", "date"]),

  // Usage alert settings
  gpt_usage_alerts: defineTable({
    userId: v.string(),
    daily_cost_limit: v.optional(v.number()),
    monthly_cost_limit: v.optional(v.number()),
    daily_token_limit: v.optional(v.number()),
    alert_email: v.optional(v.string()),
    updated_at: v.number(),
  })
    .index("by_userId", ["userId"]),
});
