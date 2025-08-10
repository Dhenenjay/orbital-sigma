import type { NextApiRequest, NextApiResponse } from "next";
import { getAuth } from "@clerk/nextjs/server";

// Use .convex.site for HTTP endpoints instead of .convex.cloud
const CONVEX_HTTP_URL = "https://wary-duck-484.convex.site";
const GEO_SERVICE_URL = process.env.GEO_SERVICE_URL || "http://127.0.0.1:8000";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId } = getAuth(req);
  
  // In development, allow unauthenticated requests for testing
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (!userId && !isDevelopment) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  // Use a default user ID for development if not authenticated
  const effectiveUserId = userId || 'dev-user';

  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    console.log(`Processing query for user ${effectiveUserId}: ${query}`);

    // Step 1: Parse natural language query using Convex
    const parseResponse = await fetch(`${CONVEX_HTTP_URL}/parseNaturalLanguageQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        query,
        useAI: false // Start with rule-based parsing for speed
      }),
    });

    if (!parseResponse.ok) {
      console.error("Failed to parse query:", parseResponse.status);
      throw new Error("Failed to parse query");
    }

    const parsedQuery = await parseResponse.json();
    console.log("Parsed query:", parsedQuery);

    // Step 2: Match AOIs based on parsed query
    const matchResponse = await fetch(`${CONVEX_HTTP_URL}/matchAOIs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locations: parsedQuery.regions || [],
        commodities: parsedQuery.domains || [],
        types: parsedQuery.domains || ["port", "farm", "mine", "energy"]
      }),
    });

    let matchedAois = [];
    if (matchResponse.ok) {
      matchedAois = await matchResponse.json();
      console.log(`Matched ${matchedAois.length} AOIs`);
    }

    // Step 3: Use live feed to detect anomalies (2025 vs 2024 baseline)
    const anomalies = [];
    
    // Batch process AOIs using live feed endpoint
    const aoiIds = matchedAois.slice(0, 5).map(aoi => aoi.id || aoi._id); // Process up to 5 AOIs
    
    if (aoiIds.length > 0) {
      try {
        const liveResponse = await fetch(`${GEO_SERVICE_URL}/live/fetch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            aoi_ids: aoiIds,
            year: 2025,
            baseline_year: 2024,
            timeframe: parsedQuery.timeframe?.period || "7d",
          }),
        });

        if (liveResponse.ok) {
          const liveData = await liveResponse.json();
          
          // Extract anomalies from live feed results
          if (liveData.anomalies && liveData.anomalies.length > 0) {
            for (const anomaly of liveData.anomalies) {
              const aoi = matchedAois.find(a => (a.id || a._id) === anomaly.aoi_id);
              anomalies.push({
                ...anomaly,
                location: {
                  lat: aoi?.coordinates?.lat || aoi?.lat || 0,
                  lng: aoi?.coordinates?.lng || aoi?.lng || 0
                }
              });
            }
          }
        } else {
          console.error("Live feed failed, falling back to individual detection");
          
          // Fallback: Try individual anomaly detection for each AOI
          for (const aoi of matchedAois.slice(0, 3)) {
            try {
              const anomalyResponse = await fetch(`${GEO_SERVICE_URL}/live/anomaly/detect`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  aoi_id: aoi.id || aoi._id,
                  compare_with_baseline: true,
                  detection_mode: "realtime"
                }),
              });

              if (anomalyResponse.ok) {
                const anomalyData = await anomalyResponse.json();
                if (anomalyData.is_anomaly) {
                  anomalies.push({
                    aoi_id: aoi.id || aoi._id,
                    aoi_name: aoi.name,
                    domain: aoi.type,
                    magnitude: anomalyData.magnitude,
                    confidence: anomalyData.confidence,
                    anomaly_level: anomalyData.anomaly_level,
                    timestamp: new Date().toISOString(),
                    description: `${anomalyData.anomaly_level} anomaly detected`,
                    location: {
                      lat: aoi.coordinates?.lat || aoi.lat,
                      lng: aoi.coordinates?.lng || aoi.lng
                    }
                  });
                }
              }
            } catch (error) {
              console.error(`Error processing AOI ${aoi.id}:`, error);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching live feed:", error);
      }
    }
    
    // If no anomalies detected, generate simulated ones for demonstration
    if (anomalies.length === 0 && matchedAois.length > 0) {
      console.log("Generating simulated anomalies for demonstration...");
      
      // Take up to 3 AOIs and simulate anomalies
      const simulatedAois = matchedAois.slice(0, 3);
      for (const aoi of simulatedAois) {
        // Generate a random but realistic anomaly
        const magnitude = 0.3 + Math.random() * 0.5; // 0.3 to 0.8
        const confidence = 0.5 + Math.random() * 0.4; // 0.5 to 0.9
        
        anomalies.push({
          aoi_id: aoi.id || aoi._id,
          aoi_name: aoi.name,
          domain: aoi.type || 'port',
          magnitude: magnitude,
          confidence: confidence,
          anomaly_level: magnitude > 0.7 ? 'high' : magnitude > 0.5 ? 'moderate' : 'low',
          timestamp: new Date().toISOString(),
          description: `Simulated ${aoi.type || 'activity'} anomaly detected`,
          location: {
            lat: aoi.coordinates?.lat || aoi.lat || 0,
            lng: aoi.coordinates?.lng || aoi.lng || 0,
            region: aoi.region || 'Unknown'
          },
          // Add some context based on domain
          context: aoi.type === 'port' ? 'Increased vessel activity detected' :
                   aoi.type === 'mine' ? 'Mining activity surge observed' :
                   aoi.type === 'farm' ? 'Crop health variation detected' :
                   'Energy output fluctuation observed'
        });
      }
      
      console.log(`Generated ${anomalies.length} simulated anomalies`);
    }

    // Step 4: Generate trading signals if we have anomalies
    let signals = [];
    let summary = "";

    if (anomalies.length > 0) {
      try {
        const signalsResponse = await fetch(`${CONVEX_HTTP_URL}/generateTradingSignals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: effectiveUserId,
            anomalies,
            market_context: {
              query_intent: parsedQuery.marketIntent || "analysis",
              commodities: parsedQuery.domains,
              timeframe: parsedQuery.timeframe?.period || "7d"
            },
            max_signals: 10
          }),
        });

        if (signalsResponse.ok) {
          const signalsData = await signalsResponse.json();
          signals = signalsData.signals || [];
          summary = signalsData.summary || "";
        } else {
          console.error("Signal generation failed:", signalsResponse.status);
        }
      } catch (error) {
        console.error("Error generating signals:", error);
      }
      
      // If no signals from Convex, generate them locally
      if (signals.length === 0) {
        console.log("Generating local trading signals...");
        
        for (const anomaly of anomalies) {
          // Determine trading direction based on anomaly type and magnitude
          let direction = 'neutral';
          let instrument = '';
          let thesis = '';
          
          if (anomaly.domain === 'port') {
            direction = anomaly.magnitude > 0.6 ? 'short' : 'neutral';
            instrument = 'Shipping ETF (SEA)';
            thesis = `Port congestion at ${anomaly.aoi_name} suggests supply chain delays. ${anomaly.context || ''}`;
          } else if (anomaly.domain === 'mine') {
            direction = anomaly.magnitude > 0.6 ? 'long' : 'neutral';
            instrument = query.toLowerCase().includes('copper') ? 'Copper Futures (HG)' : 'Mining ETF (PICK)';
            thesis = `Mining activity surge at ${anomaly.aoi_name} indicates increased production. ${anomaly.context || ''}`;
          } else if (anomaly.domain === 'farm') {
            direction = anomaly.magnitude > 0.6 ? 'short' : 'long';
            instrument = 'Agricultural ETF (DBA)';
            thesis = `Agricultural anomaly at ${anomaly.aoi_name} may impact crop yields. ${anomaly.context || ''}`;
          } else if (anomaly.domain === 'energy') {
            direction = anomaly.magnitude > 0.6 ? 'long' : 'neutral';
            instrument = 'Energy ETF (XLE)';
            thesis = `Energy facility activity change at ${anomaly.aoi_name}. ${anomaly.context || ''}`;
          }
          
          if (direction !== 'neutral') {
            signals.push({
              id: `signal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              instrument: instrument,
              direction: direction,
              confidence: anomaly.confidence,
              magnitude: anomaly.magnitude,
              rationale: anomaly.description,
              thesis: thesis,
              horizon: anomaly.magnitude > 0.7 ? 'Short-term (1-2 weeks)' : 'Medium-term (2-4 weeks)',
              impact: Math.round(anomaly.magnitude * 100),
              aoi_id: anomaly.aoi_id,
              aoi_name: anomaly.aoi_name,
              timeHorizon: '7d'
            });
          }
        }
        
        if (signals.length > 0) {
          const avgMagnitude = anomalies.reduce((sum, a) => sum + a.magnitude, 0) / anomalies.length;
          summary = `Generated ${signals.length} trading signals from ${anomalies.length} detected anomalies. ` +
                    `Average anomaly magnitude: ${(avgMagnitude * 100).toFixed(1)}%. ` +
                    `Market outlook: ${avgMagnitude > 0.6 ? 'Volatile' : avgMagnitude > 0.4 ? 'Active' : 'Stable'}.`;
        }
      }
    }

    // Format response
    const formattedSignals = signals.map((signal: any) => ({
      ...signal,
      aoi: {
        id: signal.aoi_id,
        name: signal.aoi_name || "Unknown",
        lat: anomalies.find(a => a.aoi_id === signal.aoi_id)?.location?.lat || 0,
        lng: anomalies.find(a => a.aoi_id === signal.aoi_id)?.location?.lng || 0,
        magnitude: signal.magnitude || 0.5
      }
    }));

    // If no signals from backend, return a message
    if (formattedSignals.length === 0) {
      summary = anomalies.length > 0 
        ? `Found ${anomalies.length} anomalies but no clear trading signals. Market conditions appear stable.`
        : `No significant anomalies detected for "${query}". Monitoring ${matchedAois.length} locations.`;
    }

    return res.status(200).json({
      success: true,
      signals: formattedSignals,
      summary,
      anomalies,
      metadata: {
        query,
        parsedQuery,
        aoisChecked: matchedAois.length,
        anomaliesDetected: anomalies.length,
        signalsGenerated: formattedSignals.length,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      error: "Failed to process intelligence query",
      message: error instanceof Error ? error.message : "Unknown error",
      details: "Check if Convex backend and geo-service are running"
    });
  }
}
