import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

// Handlers implemented in other modules
import { seedCatalog } from "./seed";

const http = httpRouter();
// Expose GET /aois using the catalog:getAois query
http.route({
  path: "/aois",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const typeParam = url.searchParams.get("type");
    const q = url.searchParams.get("q") || undefined;
    const type = (typeParam === "port" || typeParam === "farm" || typeParam === "mine" || typeParam === "energy")
      ? typeParam
      : undefined;

    const payload = await ctx.runQuery(api.catalog.getAois, { type: type as any, q });
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }),
});

// Expose POST /seedCatalog for data seeding
http.route({ path: "/seedCatalog", method: "POST", handler: seedCatalog });

// Parse natural language query
http.route({
  path: "/parseNaturalLanguageQuery",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await req.json();
    const result = await ctx.runAction(api.parseNaturalLanguageQuery.parseNaturalLanguageQuery, body);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }),
});

// Match AOIs based on query
http.route({
  path: "/matchAOIs",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await req.json();
    const result = await ctx.runQuery(api.matchAOIs.matchAOIsWithQuery, body);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }),
});

// Generate trading signals
http.route({
  path: "/generateTradingSignals",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await req.json();
    const result = await ctx.runAction(api.tradingSignals.generateTradingSignals, body);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }),
});

// Log query
http.route({
  path: "/logQuery",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const body = await req.json();
    // For now, just return success - you can implement actual logging later
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }),
});

export default http;
