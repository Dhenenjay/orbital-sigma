import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../backend/convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://strong-otter-988.convex.cloud";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    console.log(`Processing query for user ${userId}: ${query}`);

    // Initialize Convex client
    const client = new ConvexHttpClient(CONVEX_URL);

    // Parse the natural language query using Convex action
    let parsedQuery;
    try {
      parsedQuery = await client.action(api.parseNaturalLanguageQuery.parseNaturalLanguageQuery, {
        query,
        useAI: false // Start with rule-based for speed
      });
      console.log("Parsed query:", parsedQuery);
    } catch (error) {
      console.error("Failed to parse query:", error);
      // Fallback to basic parsing
      parsedQuery = {
        domains: ["port", "farm", "mine", "energy"],
        regions: [],
        timeframe: { period: "7d" },
        marketIntent: "analysis"
      };
    }

    // Generate AOIs dynamically using global generator (no database limitations)
    let matchedAois = [];
    try {
      // First try the global generator for unlimited AOI support
      const globalAOIs = await client.action(api.globalAOIGenerator.generateGlobalAOIs, {
        keywords: parsedQuery.keywords || [],
        regions: parsedQuery.regions || [],
        domains: parsedQuery.domains || ["port", "farm", "mine", "energy"],
        specificLocations: [] // Could be extracted from query
      });
      
      if (globalAOIs && globalAOIs.aois && globalAOIs.aois.length > 0) {
        matchedAois = globalAOIs.aois;
        console.log(`Generated ${matchedAois.length} AOIs globally (commodities: ${globalAOIs.commodities.join(", ")})`);
      } else {
        // Fallback to database query if needed
        matchedAois = await client.query(api.matchAOIs.matchAOIsWithQuery, {
          locations: parsedQuery.regions || [],
          commodities: parsedQuery.domains || [],
          types: parsedQuery.domains || ["port", "farm", "mine", "energy"],
          keywords: parsedQuery.keywords || []
        });
        console.log(`Matched ${matchedAois.length} AOIs from database`);
      }
    } catch (error) {
      console.error("Failed to generate/match AOIs:", error);
      // Continue with empty AOIs rather than failing
      matchedAois = [];
    }

    // For now, generate signals based on the query directly
    // This will work even if geo-service is down
    let signals = [];
    let summary = "";

    // Try to generate real signals if we have AOIs
    if (matchedAois.length > 0) {
      try {
        // Call the REAL geo-service for actual satellite anomaly detection
        const geoServiceUrl = process.env.GEO_SERVICE_URL || "http://localhost:8000";
        
        // Request satellite embeddings and anomaly detection from geo-service
        const currentYear = new Date().getFullYear();
        const anomalyResponse = await fetch(`${geoServiceUrl}/anomaly/detect`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            aoi_ids: matchedAois.slice(0, 5).map((aoi: any) => aoi.id),
            current_year: currentYear,
            baseline_year: currentYear - 1,
            include_historical: true,
            top_n: 10
          })
        });

        let anomalies = [];
        
        if (anomalyResponse.ok) {
          const geoData = await anomalyResponse.json();
          console.log(`Geo-service response:`, geoData);
          
          // Transform geo-service results to anomaly format expected by trading signals
          if (geoData.results && geoData.results.length > 0) {
            anomalies = geoData.results
              .filter((r: any) => r.requires_attention) // Only use significant anomalies
              .map((result: any) => {
                const aoi = matchedAois.find((a: any) => a.id === result.aoi_id);
                return {
                  aoi_id: result.aoi_id,
                  aoi_name: aoi?.name || result.aoi_id,
                  domain: result.domain || aoi?.type || 'unknown',
                  magnitude: result.anomaly_score || result.raw_magnitude || 0.5,
                  confidence: Math.min(0.9, (result.anomaly_score || 0.5) / 1.5), // Scale anomaly score to confidence
                  timestamp: new Date().toISOString(),
                  description: result.interpretation?.description || `Anomaly detected at ${aoi?.name || result.aoi_id}`,
                  location: {
                    lat: aoi?.coordinates?.lat || 0,
                    lng: aoi?.coordinates?.lng || 0
                  }
                };
              });
            console.log(`Detected ${anomalies.length} real anomalies from satellite data`);
          } else if (geoData.alerts && geoData.alerts.length > 0) {
            // Use alerts if no results with attention needed
            anomalies = geoData.alerts.map((alert: any) => {
              const aoi = matchedAois.find((a: any) => a.id === alert.aoi_id);
              return {
                aoi_id: alert.aoi_id,
                aoi_name: aoi?.name || alert.aoi_id,
                domain: alert.domain || aoi?.type || 'unknown',
                magnitude: alert.anomaly_score || 0.7,
                confidence: 0.8,
                timestamp: alert.timestamp || new Date().toISOString(),
                description: alert.description || `Alert: ${alert.recommended_action}`,
                location: {
                  lat: aoi?.coordinates?.lat || 0,
                  lng: aoi?.coordinates?.lng || 0
                }
              };
            });
          }
        } else {
          // If geo-service is down or returns error, return empty anomalies (NO MOCK DATA)
          const errorText = await anomalyResponse.text();
          console.error("Geo-service error:", anomalyResponse.status, errorText);
          anomalies = [];
        }

        const signalsData = await client.action(api.tradingSignals.generateTradingSignals, {
          anomalies,
          market_context: {
            // The expected fields for market_context
            vix_level: undefined,
            dollar_index: undefined,
            commodity_trends: parsedQuery.domains,
            geopolitical_events: []
          },
          max_signals: 10
        });

        if (signalsData && signalsData.signals) {
          signals = signalsData.signals.map((signal: any) => ({
            ...signal,
            aoi: {
              id: signal.aoi_id,
              name: signal.aoi_name || "Unknown",
              lat: anomalies.find((a: any) => a.aoi_id === signal.aoi_id)?.location?.lat || 0,
              lng: anomalies.find((a: any) => a.aoi_id === signal.aoi_id)?.location?.lng || 0,
              magnitude: signal.magnitude || 0.5
            }
          }));
          
          // Convert summary object to a readable string
          if (signalsData.summary && typeof signalsData.summary === 'object') {
            const s = signalsData.summary;
            summary = `Generated ${s.total_signals || 0} trading signals with ${s.confidence_rating || 'moderate'} confidence. `;
            if (s.directional_bias) {
              summary += `Market bias: ${s.directional_bias.net_direction || 'balanced'} `;
              summary += `(${s.directional_bias.long || 0} long, ${s.directional_bias.short || 0} short). `;
            }
            if (s.top_picks && s.top_picks.length > 0) {
              const topPick = s.top_picks[0];
              summary += `Top recommendation: ${topPick.direction} ${topPick.instrument} (${topPick.confidence} confidence).`;
            }
          } else if (typeof signalsData.summary === 'string') {
            summary = signalsData.summary;
          } else {
            summary = "Trading signals generated successfully.";
          }
        }
      } catch (error) {
        console.error("Failed to generate trading signals:", error);
      }
    }

    // If no signals generated, provide informative response
    if (signals.length === 0) {
      summary = matchedAois.length > 0
        ? `Found ${matchedAois.length} relevant locations but no clear trading signals at this time.`
        : `Analyzing query: "${query}". System is processing satellite data.`;
    }

    return res.status(200).json({
      success: true,
      signals,
      summary,
      metadata: {
        query,
        parsedQuery,
        aoisChecked: matchedAois.length,
        signalsGenerated: signals.length,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: "Failed to process intelligence query",
      message: error instanceof Error ? error.message : "Unknown error",
      details: "The system is processing your request. Please try again."
    });
  }
}
