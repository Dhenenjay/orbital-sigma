/**
 * Start Query Action
 * Handles natural language queries and returns anomaly data
 */

import { v } from "convex/values";
import { action } from "./_generated/server";
import { convertToApiParams } from "./queryToApiParams";

export const startQuery = action({
  args: {
    query: v.string(),
    useAI: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      // Parse the natural language query and convert to API params
      const result = await ctx.runAction("convertQueryToApiParams", {
        query: args.query,
        useAI: args.useAI ?? true,
        includeEmbeddings: false,
      });
      
      // Here you would typically make the API call to fetch embeddings
      // For now, we'll return the parsed query and parameters
      
      return {
        success: true,
        query: args.query,
        interpretation: result.interpretation,
        params: result.params,
        queryString: result.queryString,
        // In production, add the actual anomaly data here:
        // anomalies: await fetchAnomalies(result.params),
        message: `Query processed: ${result.interpretation}`,
      };
    } catch (error) {
      console.error("Error processing query:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to process query",
        query: args.query,
      };
    }
  },
});
