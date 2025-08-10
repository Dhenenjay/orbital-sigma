
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../backend/convex/_generated/api";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ error: 'Query is required' });
    }

    try {
        const convex = new ConvexHttpClient(process.env.CONVEX_URL);

        // 1. Parse the natural language query to get AOIs and other parameters
        const queryParams = await convex.action(api.parseNaturalLanguageQuery.parseNaturalLanguageQuery, { query });

        // 2. Find matching AOIs from the database
        const matchedAOIs = await convex.action(api.matchAOIs.findMatchingAOIs, { queryParams });

        // 3. Generate signals from the matched AOIs
        const result = await convex.action(api.generateSignals.generateSignalsFromAnomalies, { 
            queryId: matchedAOIs.queryId, 
            anomalies: matchedAOIs.anomalies 
        });

        res.status(200).json(result);
    } catch (error) {
        console.error('Error generating signals:', error);
        res.status(500).json({ error: 'Failed to generate signals' });
    }
}

