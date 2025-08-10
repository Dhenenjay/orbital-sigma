/**
 * Token usage and cost tracking for GPT API calls
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * GPT model pricing (as of 2024)
 * Prices in USD per 1K tokens
 */
const MODEL_PRICING = {
  "gpt-4-turbo-preview": {
    input: 0.01,   // $10 per 1M input tokens
    output: 0.03,  // $30 per 1M output tokens
  },
  "gpt-4": {
    input: 0.03,   // $30 per 1M input tokens
    output: 0.06,  // $60 per 1M output tokens
  },
  "gpt-4-32k": {
    input: 0.06,   // $60 per 1M input tokens
    output: 0.12,  // $120 per 1M output tokens
  },
  "gpt-3.5-turbo": {
    input: 0.0005,  // $0.50 per 1M input tokens
    output: 0.0015, // $1.50 per 1M output tokens
  },
  // Add GPT-5 pricing when available
  "gpt-5": {
    input: 0.05,   // Estimated
    output: 0.15,  // Estimated
  },
};

/**
 * Log token usage for a GPT API call
 */
export const logTokenUsage = mutation({
  args: {
    userId: v.string(),
    queryId: v.optional(v.id("queries")),
    model: v.string(),
    
    // Token counts
    prompt_tokens: v.number(),
    completion_tokens: v.number(),
    total_tokens: v.number(),
    
    // Context
    endpoint: v.string(), // Which function called GPT
    purpose: v.string(), // What the call was for
    
    // Optional metadata
    anomaly_count: v.optional(v.number()),
    signal_count: v.optional(v.number()),
    error: v.optional(v.string()),
    cache_hit: v.optional(v.boolean()),
    
    // Timing
    response_time_ms: v.number(),
  },
  handler: async (ctx, args) => {
    // Calculate costs
    const pricing = MODEL_PRICING[args.model as keyof typeof MODEL_PRICING] || MODEL_PRICING["gpt-4-turbo-preview"];
    
    const input_cost = (args.prompt_tokens / 1000) * pricing.input;
    const output_cost = (args.completion_tokens / 1000) * pricing.output;
    const total_cost = input_cost + output_cost;
    
    // Store usage record
    const usageId = await ctx.db.insert("gpt_usage", {
      userId: args.userId,
      queryId: args.queryId,
      timestamp: Date.now(),
      
      // Model info
      model: args.model,
      endpoint: args.endpoint,
      purpose: args.purpose,
      
      // Token counts
      prompt_tokens: args.prompt_tokens,
      completion_tokens: args.completion_tokens,
      total_tokens: args.total_tokens,
      
      // Costs in USD
      input_cost,
      output_cost,
      total_cost,
      
      // Metadata
      anomaly_count: args.anomaly_count,
      signal_count: args.signal_count,
      error: args.error,
      cache_hit: args.cache_hit || false,
      response_time_ms: args.response_time_ms,
    });
    
    // Update daily usage summary
    await updateDailySummary(ctx, args.userId, total_cost, args.total_tokens);
    
    // Check for usage alerts
    await checkUsageAlerts(ctx, args.userId);
    
    return {
      usage_id: usageId,
      cost: total_cost,
      cost_breakdown: {
        input: input_cost,
        output: output_cost,
        total: total_cost,
      },
    };
  },
});

/**
 * Get usage statistics for a user
 */
export const getUserUsageStats = query({
  args: {
    userId: v.string(),
    timeframe: v.optional(v.union(
      v.literal("today"),
      v.literal("week"),
      v.literal("month"),
      v.literal("all")
    )),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const timeframe = args.timeframe || "month";
    
    let startTime: number;
    switch (timeframe) {
      case "today":
        startTime = new Date().setHours(0, 0, 0, 0);
        break;
      case "week":
        startTime = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        startTime = now - 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        startTime = 0;
    }
    
    // Get usage records
    const records = await ctx.db
      .query("gpt_usage")
      .withIndex("by_user_and_time", q => 
        q.eq("userId", args.userId).gte("timestamp", startTime)
      )
      .collect();
    
    // Calculate statistics
    const stats = {
      total_calls: records.length,
      successful_calls: records.filter(r => !r.error).length,
      failed_calls: records.filter(r => !!r.error).length,
      
      total_tokens: records.reduce((sum, r) => sum + r.total_tokens, 0),
      total_cost: records.reduce((sum, r) => sum + r.total_cost, 0),
      
      average_tokens_per_call: records.length > 0 ? 
        Math.round(records.reduce((sum, r) => sum + r.total_tokens, 0) / records.length) : 0,
      
      average_cost_per_call: records.length > 0 ?
        records.reduce((sum, r) => sum + r.total_cost, 0) / records.length : 0,
      
      average_response_time_ms: records.length > 0 ?
        Math.round(records.reduce((sum, r) => sum + r.response_time_ms, 0) / records.length) : 0,
      
      by_model: {} as Record<string, any>,
      by_endpoint: {} as Record<string, any>,
      
      cache_hit_rate: records.length > 0 ?
        (records.filter(r => r.cache_hit).length / records.length) * 100 : 0,
    };
    
    // Group by model
    const modelGroups = groupBy(records, 'model');
    for (const [model, modelRecords] of Object.entries(modelGroups)) {
      stats.by_model[model] = {
        calls: modelRecords.length,
        total_tokens: modelRecords.reduce((sum, r) => sum + r.total_tokens, 0),
        total_cost: modelRecords.reduce((sum, r) => sum + r.total_cost, 0),
      };
    }
    
    // Group by endpoint
    const endpointGroups = groupBy(records, 'endpoint');
    for (const [endpoint, endpointRecords] of Object.entries(endpointGroups)) {
      stats.by_endpoint[endpoint] = {
        calls: endpointRecords.length,
        total_tokens: endpointRecords.reduce((sum, r) => sum + r.total_tokens, 0),
        total_cost: endpointRecords.reduce((sum, r) => sum + r.total_cost, 0),
        average_response_time: Math.round(
          endpointRecords.reduce((sum, r) => sum + r.response_time_ms, 0) / endpointRecords.length
        ),
      };
    }
    
    return stats;
  },
});

/**
 * Get detailed usage history
 */
export const getUsageHistory = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const offset = args.offset || 0;
    
    const records = await ctx.db
      .query("gpt_usage")
      .withIndex("by_user_and_time", q => q.eq("userId", args.userId))
      .collect();
    
    // Sort by timestamp descending
    records.sort((a, b) => b.timestamp - a.timestamp);
    
    // Paginate
    const paginatedRecords = records.slice(offset, offset + limit);
    
    return {
      records: paginatedRecords.map(r => ({
        id: r._id,
        timestamp: new Date(r.timestamp).toISOString(),
        model: r.model,
        endpoint: r.endpoint,
        purpose: r.purpose,
        tokens: {
          prompt: r.prompt_tokens,
          completion: r.completion_tokens,
          total: r.total_tokens,
        },
        cost: {
          input: r.input_cost,
          output: r.output_cost,
          total: r.total_cost,
        },
        metadata: {
          anomaly_count: r.anomaly_count,
          signal_count: r.signal_count,
          cache_hit: r.cache_hit,
          response_time_ms: r.response_time_ms,
        },
        error: r.error,
      })),
      total_records: records.length,
      has_more: offset + limit < records.length,
    };
  },
});

/**
 * Get daily usage summaries
 */
export const getDailyUsageSummaries = query({
  args: {
    userId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    
    const summaries = await ctx.db
      .query("gpt_daily_usage")
      .withIndex("by_user_and_date", q => 
        q.eq("userId", args.userId).gte("date", startDate.toISOString().split('T')[0])
      )
      .collect();
    
    // Sort by date
    summaries.sort((a, b) => a.date.localeCompare(b.date));
    
    return {
      summaries: summaries.map(s => ({
        date: s.date,
        total_calls: s.total_calls,
        total_tokens: s.total_tokens,
        total_cost: s.total_cost,
        average_cost_per_call: s.total_calls > 0 ? s.total_cost / s.total_calls : 0,
      })),
      total_cost: summaries.reduce((sum, s) => sum + s.total_cost, 0),
      total_tokens: summaries.reduce((sum, s) => sum + s.total_tokens, 0),
      daily_average_cost: summaries.length > 0 ?
        summaries.reduce((sum, s) => sum + s.total_cost, 0) / summaries.length : 0,
    };
  },
});

/**
 * Set usage alert thresholds
 */
export const setUsageAlerts = mutation({
  args: {
    userId: v.string(),
    daily_cost_limit: v.optional(v.number()),
    monthly_cost_limit: v.optional(v.number()),
    daily_token_limit: v.optional(v.number()),
    alert_email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("gpt_usage_alerts")
      .withIndex("by_userId", q => q.eq("userId", args.userId))
      .unique();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        daily_cost_limit: args.daily_cost_limit,
        monthly_cost_limit: args.monthly_cost_limit,
        daily_token_limit: args.daily_token_limit,
        alert_email: args.alert_email,
        updated_at: Date.now(),
      });
    } else {
      await ctx.db.insert("gpt_usage_alerts", {
        userId: args.userId,
        daily_cost_limit: args.daily_cost_limit,
        monthly_cost_limit: args.monthly_cost_limit,
        daily_token_limit: args.daily_token_limit,
        alert_email: args.alert_email,
        updated_at: Date.now(),
      });
    }
    
    return { success: true };
  },
});

/**
 * Get cost breakdown by purpose
 */
export const getCostBreakdown = query({
  args: {
    userId: v.string(),
    groupBy: v.optional(v.union(
      v.literal("purpose"),
      v.literal("model"),
      v.literal("endpoint")
    )),
  },
  handler: async (ctx, args) => {
    const records = await ctx.db
      .query("gpt_usage")
      .withIndex("by_user_and_time", q => q.eq("userId", args.userId))
      .collect();
    
    const groupBy = args.groupBy || "purpose";
    const groups = {} as Record<string, any>;
    
    for (const record of records) {
      const key = record[groupBy as keyof typeof record] as string;
      if (!groups[key]) {
        groups[key] = {
          count: 0,
          total_cost: 0,
          total_tokens: 0,
          average_response_time: 0,
        };
      }
      
      groups[key].count += 1;
      groups[key].total_cost += record.total_cost;
      groups[key].total_tokens += record.total_tokens;
      groups[key].average_response_time += record.response_time_ms;
    }
    
    // Calculate averages
    for (const key in groups) {
      if (groups[key].count > 0) {
        groups[key].average_response_time /= groups[key].count;
        groups[key].average_cost = groups[key].total_cost / groups[key].count;
        groups[key].average_tokens = Math.round(groups[key].total_tokens / groups[key].count);
      }
    }
    
    // Sort by total cost
    const sorted = Object.entries(groups)
      .sort(([, a], [, b]) => b.total_cost - a.total_cost)
      .map(([key, data]) => ({ [groupBy]: key, ...data }));
    
    return {
      breakdown: sorted,
      total_cost: records.reduce((sum, r) => sum + r.total_cost, 0),
      total_calls: records.length,
    };
  },
});

// Helper functions

function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((result, item) => {
    const group = String(item[key]);
    if (!result[group]) result[group] = [];
    result[group].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

async function updateDailySummary(ctx: any, userId: string, cost: number, tokens: number) {
  const today = new Date().toISOString().split('T')[0];
  
  const existing = await ctx.db
    .query("gpt_daily_usage")
    .withIndex("by_user_and_date", q => q.eq("userId", userId).eq("date", today))
    .unique();
  
  if (existing) {
    await ctx.db.patch(existing._id, {
      total_calls: existing.total_calls + 1,
      total_tokens: existing.total_tokens + tokens,
      total_cost: existing.total_cost + cost,
    });
  } else {
    await ctx.db.insert("gpt_daily_usage", {
      userId,
      date: today,
      total_calls: 1,
      total_tokens: tokens,
      total_cost: cost,
    });
  }
}

async function checkUsageAlerts(ctx: any, userId: string) {
  const alerts = await ctx.db
    .query("gpt_usage_alerts")
    .withIndex("by_userId", q => q.eq("userId", userId))
    .unique();
  
  if (!alerts) return;
  
  // Check daily limit
  if (alerts.daily_cost_limit) {
    const today = new Date().toISOString().split('T')[0];
    const dailyUsage = await ctx.db
      .query("gpt_daily_usage")
      .withIndex("by_user_and_date", q => q.eq("userId", userId).eq("date", today))
      .unique();
    
    if (dailyUsage && dailyUsage.total_cost > alerts.daily_cost_limit) {
      console.warn(`User ${userId} exceeded daily cost limit: $${dailyUsage.total_cost.toFixed(2)} > $${alerts.daily_cost_limit}`);
      // Here you could trigger an email notification or other alert
    }
  }
  
  // Check monthly limit
  if (alerts.monthly_cost_limit) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const monthlyRecords = await ctx.db
      .query("gpt_usage")
      .withIndex("by_user_and_time", q => 
        q.eq("userId", userId).gte("timestamp", startOfMonth.getTime())
      )
      .collect();
    
    const monthlyTotal = monthlyRecords.reduce((sum, r) => sum + r.total_cost, 0);
    
    if (monthlyTotal > alerts.monthly_cost_limit) {
      console.warn(`User ${userId} exceeded monthly cost limit: $${monthlyTotal.toFixed(2)} > $${alerts.monthly_cost_limit}`);
    }
  }
}
