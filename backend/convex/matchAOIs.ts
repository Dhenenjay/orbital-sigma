/**
 * Match Areas of Interest (AOIs) from user text
 * Uses fuzzy matching, semantic search, and NLP to identify relevant AOIs
 */

import { v } from "convex/values";
import { action, query } from "./_generated/server";
import { api } from "./_generated/api";
import OpenAI from 'openai';

// Initialize OpenAI client for semantic matching
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Common location aliases and variations
const LOCATION_ALIASES: Record<string, string[]> = {
  // Ports
  "port-shanghai": ["shanghai port", "shanghai", "pvg", "chinese port", "china port", "yangshan"],
  "port-singapore": ["singapore port", "singapore", "sin", "psa", "southeast asia port"],
  "port-rotterdam": ["rotterdam", "rotterdam port", "dutch port", "netherlands port", "rtm"],
  "port-losangeles": ["los angeles port", "la port", "long beach", "california port", "san pedro"],
  "port-houston": ["houston port", "houston", "texas port", "gulf port", "galveston"],
  
  // Farms
  "farm-iowa": ["iowa", "iowa farms", "corn belt", "midwest farms", "us agriculture"],
  "farm-mato-grosso": ["mato grosso", "brazil farms", "brazilian agriculture", "soybean region"],
  "farm-punjab": ["punjab", "india farms", "indian agriculture", "wheat region"],
  "farm-ukraine": ["ukraine", "ukrainian farms", "black sea grain", "wheat belt"],
  
  // Mines
  "mine-pilbara": ["pilbara", "australian mines", "iron ore region", "wa mining"],
  "mine-atacama": ["atacama", "chile mines", "copper region", "chilean mining"],
  "mine-congo": ["congo", "drc mines", "cobalt region", "katanga"],
  
  // Energy
  "energy-ghawar": ["ghawar", "saudi oil", "aramco", "saudi arabia oil"],
  "energy-permian": ["permian", "permian basin", "texas oil", "shale oil"],
  "energy-three-gorges": ["three gorges", "yangtze dam", "chinese hydro", "hubei dam"],
};

// Keywords that suggest specific AOI types
const DOMAIN_KEYWORDS: Record<string, string[]> = {
  port: ["port", "harbor", "shipping", "vessel", "container", "maritime", "dock", "terminal", "wharf", "berth"],
  farm: ["farm", "agriculture", "crop", "harvest", "grain", "wheat", "corn", "soy", "rice", "plantation", "field"],
  mine: ["mine", "mining", "copper", "gold", "iron", "lithium", "nickel", "extraction", "quarry", "mineral", "ore"],
  energy: ["energy", "oil", "gas", "refinery", "pipeline", "lng", "power", "nuclear", "coal", "solar", "wind", "hydro"],
};

export interface AOIMatch {
  aoiId: string;
  name: string;
  type: string;
  confidence: number;
  matchReason: string;
  bbox?: number[];
  description?: string;
}

export interface AOIMatchResult {
  matches: AOIMatch[];
  query: string;
  interpretedLocation?: string;
  interpretedDomain?: string;
  suggestions?: string[];
}

/**
 * Main function to match AOIs from user text
 */
export const matchAOIsFromText = action({
  args: {
    text: v.string(),
    maxMatches: v.optional(v.number()),
    minConfidence: v.optional(v.number()),
    useAI: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<AOIMatchResult> => {
    const { text, maxMatches = 5, minConfidence = 0.3, useAI = true } = args;
    
    console.log(`Matching AOIs from text: "${text}"`);
    
    // Get all AOIs from catalog
    const allAOIs = await ctx.runQuery(api.catalog.getAois, {});
    
    // Perform multi-strategy matching
    let matches: AOIMatch[] = [];
    
    // 1. Direct name matching
    const directMatches = matchDirectNames(text, allAOIs);
    matches.push(...directMatches);
    
    // 2. Alias matching
    const aliasMatches = matchByAliases(text, allAOIs);
    matches.push(...aliasMatches);
    
    // 3. Description matching
    const descriptionMatches = matchByDescription(text, allAOIs);
    matches.push(...descriptionMatches);
    
    // 4. Domain-based matching
    const domainMatches = matchByDomain(text, allAOIs);
    matches.push(...domainMatches);
    
    // 5. Geographic matching
    const geoMatches = matchByGeography(text, allAOIs);
    matches.push(...geoMatches);
    
    // 6. AI-enhanced matching (if enabled and needed)
    if (useAI && matches.length < 3) {
      try {
        const aiMatches = await matchWithAI(text, allAOIs);
        matches.push(...aiMatches);
      } catch (error) {
        console.error("AI matching failed:", error);
      }
    }
    
    // Deduplicate and sort by confidence
    const uniqueMatches = deduplicateMatches(matches);
    const sortedMatches = uniqueMatches
      .filter(m => m.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxMatches);
    
    // Extract interpreted location and domain
    const interpretation = interpretQuery(text);
    
    // Generate suggestions if no strong matches
    let suggestions: string[] | undefined;
    if (sortedMatches.length === 0 || sortedMatches[0].confidence < 0.7) {
      suggestions = generateSuggestions(text, allAOIs);
    }
    
    return {
      matches: sortedMatches,
      query: text,
      interpretedLocation: interpretation.location,
      interpretedDomain: interpretation.domain,
      suggestions,
    };
  },
});

/**
 * Direct name matching
 */
function matchDirectNames(text: string, aois: any[]): AOIMatch[] {
  const matches: AOIMatch[] = [];
  const lowerText = text.toLowerCase();
  
  for (const aoi of aois) {
    const aoiName = aoi.name.toLowerCase();
    const aoiId = aoi.id.toLowerCase();
    
    // Exact match
    if (lowerText.includes(aoiName) || lowerText.includes(aoiId)) {
      matches.push({
        aoiId: aoi.id,
        name: aoi.name,
        type: aoi.type,
        confidence: 0.95,
        matchReason: "Direct name match",
        bbox: aoi.bbox,
        description: aoi.description,
      });
      continue;
    }
    
    // Partial match (each word in AOI name)
    const nameWords = aoiName.split(/[\s,()]+/).filter(w => w.length > 2);
    const matchedWords = nameWords.filter(word => lowerText.includes(word));
    
    if (matchedWords.length > 0) {
      const confidence = 0.6 + (0.3 * matchedWords.length / nameWords.length);
      matches.push({
        aoiId: aoi.id,
        name: aoi.name,
        type: aoi.type,
        confidence,
        matchReason: `Partial name match (${matchedWords.join(", ")})`,
        bbox: aoi.bbox,
        description: aoi.description,
      });
    }
  }
  
  return matches;
}

/**
 * Match using location aliases
 */
function matchByAliases(text: string, aois: any[]): AOIMatch[] {
  const matches: AOIMatch[] = [];
  const lowerText = text.toLowerCase();
  
  for (const [aoiId, aliases] of Object.entries(LOCATION_ALIASES)) {
    for (const alias of aliases) {
      if (lowerText.includes(alias.toLowerCase())) {
        const aoi = aois.find(a => a.id === aoiId);
        if (aoi) {
          matches.push({
            aoiId: aoi.id,
            name: aoi.name,
            type: aoi.type,
            confidence: 0.85,
            matchReason: `Alias match (${alias})`,
            bbox: aoi.bbox,
            description: aoi.description,
          });
          break;
        }
      }
    }
  }
  
  return matches;
}

/**
 * Match by description content
 */
function matchByDescription(text: string, aois: any[]): AOIMatch[] {
  const matches: AOIMatch[] = [];
  const lowerText = text.toLowerCase();
  const textWords = lowerText.split(/\s+/).filter(w => w.length > 3);
  
  for (const aoi of aois) {
    if (!aoi.description) continue;
    
    const description = aoi.description.toLowerCase();
    const matchedWords = textWords.filter(word => description.includes(word));
    
    if (matchedWords.length >= 2) {
      const confidence = Math.min(0.7, 0.3 + (0.1 * matchedWords.length));
      matches.push({
        aoiId: aoi.id,
        name: aoi.name,
        type: aoi.type,
        confidence,
        matchReason: `Description match (${matchedWords.slice(0, 3).join(", ")})`,
        bbox: aoi.bbox,
        description: aoi.description,
      });
    }
  }
  
  return matches;
}

/**
 * Match by domain keywords
 */
function matchByDomain(text: string, aois: any[]): AOIMatch[] {
  const matches: AOIMatch[] = [];
  const lowerText = text.toLowerCase();
  
  // Identify domains mentioned
  const mentionedDomains: string[] = [];
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      mentionedDomains.push(domain);
    }
  }
  
  if (mentionedDomains.length === 0) return matches;
  
  // Find AOIs matching the domains
  for (const aoi of aois) {
    if (mentionedDomains.includes(aoi.type)) {
      // Check for geographic context
      const geoContext = extractGeographicContext(text);
      let confidence = 0.4; // Base confidence for domain match
      
      if (geoContext && aoi.name.toLowerCase().includes(geoContext.toLowerCase())) {
        confidence = 0.75;
      }
      
      matches.push({
        aoiId: aoi.id,
        name: aoi.name,
        type: aoi.type,
        confidence,
        matchReason: `Domain match (${aoi.type})${geoContext ? ` in ${geoContext}` : ""}`,
        bbox: aoi.bbox,
        description: aoi.description,
      });
    }
  }
  
  return matches;
}

/**
 * Match by geographic proximity
 */
function matchByGeography(text: string, aois: any[]): AOIMatch[] {
  const matches: AOIMatch[] = [];
  const geoTerms = extractGeographicTerms(text);
  
  if (geoTerms.length === 0) return matches;
  
  for (const aoi of aois) {
    const aoiGeoTerms = extractGeographicTerms(aoi.name + " " + (aoi.description || ""));
    const commonTerms = geoTerms.filter(term => 
      aoiGeoTerms.some(aoiTerm => 
        aoiTerm.toLowerCase().includes(term.toLowerCase()) ||
        term.toLowerCase().includes(aoiTerm.toLowerCase())
      )
    );
    
    if (commonTerms.length > 0) {
      const confidence = Math.min(0.8, 0.4 + (0.2 * commonTerms.length));
      matches.push({
        aoiId: aoi.id,
        name: aoi.name,
        type: aoi.type,
        confidence,
        matchReason: `Geographic match (${commonTerms.join(", ")})`,
        bbox: aoi.bbox,
        description: aoi.description,
      });
    }
  }
  
  return matches;
}

/**
 * AI-enhanced matching using embeddings
 */
async function matchWithAI(text: string, aois: any[]): Promise<AOIMatch[]> {
  const systemPrompt = `You are an AOI (Area of Interest) matcher for a satellite monitoring system.
Given a user query, identify which AOIs from the provided list are most relevant.
Consider location names, geographic regions, facility types, and contextual clues.
Return only the IDs of matching AOIs with confidence scores.`;

  const aoiList = aois.map(a => `${a.id}: ${a.name} (${a.type}) - ${a.description || 'No description'}`).join('\n');
  
  const userPrompt = `Query: "${text}"

Available AOIs:
${aoiList}

Identify the most relevant AOIs for this query. Return as JSON array:
[{"id": "aoi-id", "confidence": 0.0-1.0, "reason": "brief explanation"}]`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 500,
    });
    
    const response = completion.choices[0].message.content;
    if (!response) return [];
    
    const parsed = JSON.parse(response);
    const aiMatches = Array.isArray(parsed) ? parsed : (parsed.matches || []);
    
    return aiMatches
      .filter((m: any) => m.id && m.confidence)
      .map((m: any) => {
        const aoi = aois.find(a => a.id === m.id);
        if (!aoi) return null;
        
        return {
          aoiId: aoi.id,
          name: aoi.name,
          type: aoi.type,
          confidence: m.confidence * 0.9, // Slightly reduce AI confidence
          matchReason: `AI match: ${m.reason || 'Semantic similarity'}`,
          bbox: aoi.bbox,
          description: aoi.description,
        };
      })
      .filter(Boolean) as AOIMatch[];
      
  } catch (error) {
    console.error("AI matching error:", error);
    return [];
  }
}

/**
 * Deduplicate matches, keeping highest confidence
 */
function deduplicateMatches(matches: AOIMatch[]): AOIMatch[] {
  const uniqueMap = new Map<string, AOIMatch>();
  
  for (const match of matches) {
    const existing = uniqueMap.get(match.aoiId);
    if (!existing || match.confidence > existing.confidence) {
      uniqueMap.set(match.aoiId, match);
    }
  }
  
  return Array.from(uniqueMap.values());
}

/**
 * Interpret the query to extract location and domain
 */
function interpretQuery(text: string): { location?: string; domain?: string } {
  const location = extractGeographicContext(text);
  
  let domain: string | undefined;
  const lowerText = text.toLowerCase();
  for (const [d, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some(k => lowerText.includes(k))) {
      domain = d;
      break;
    }
  }
  
  return { location, domain };
}

/**
 * Extract geographic context from text
 */
function extractGeographicContext(text: string): string | undefined {
  const geoPatterns = [
    /\b(china|chinese|beijing|shanghai|shenzhen|guangzhou)\b/i,
    /\b(usa?|america|united states|california|texas|new york)\b/i,
    /\b(singapore|malaysian?|indonesia|thailand|vietnam)\b/i,
    /\b(brazil|brazilian|argentina|chile|peru|colombia)\b/i,
    /\b(india|indian|pakistan|bangladesh)\b/i,
    /\b(europe|european|germany|france|uk|britain|netherlands)\b/i,
    /\b(australia|australian|new zealand)\b/i,
    /\b(middle east|saudi|uae|qatar|kuwait|iran|iraq)\b/i,
    /\b(africa|african|egypt|nigeria|south africa|kenya)\b/i,
  ];
  
  for (const pattern of geoPatterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  
  return undefined;
}

/**
 * Extract geographic terms from text
 */
function extractGeographicTerms(text: string): string[] {
  const terms: string[] = [];
  const patterns = [
    // Countries
    /\b(china|usa?|singapore|brazil|india|australia|germany|france|saudi|japan|korea)\b/gi,
    // Regions
    /\b(asia|europe|america|africa|middle east|pacific|atlantic)\b/gi,
    // Cities
    /\b(shanghai|singapore|rotterdam|houston|chicago|mumbai|sydney|london|tokyo)\b/gi,
    // Geographic features
    /\b(gulf|strait|sea|ocean|river|desert|basin|valley)\b/gi,
  ];
  
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      terms.push(...matches);
    }
  }
  
  return [...new Set(terms)]; // Remove duplicates
}

/**
 * Generate suggestions when no strong matches found
 */
function generateSuggestions(text: string, aois: any[]): string[] {
  const suggestions: string[] = [];
  const interpretation = interpretQuery(text);
  
  if (interpretation.domain) {
    // Suggest AOIs of the same domain
    const domainAOIs = aois.filter(a => a.type === interpretation.domain);
    suggestions.push(
      ...domainAOIs.slice(0, 3).map(a => `Did you mean ${a.name}?`)
    );
  }
  
  if (interpretation.location) {
    // Suggest AOIs in the same region
    const regionAOIs = aois.filter(a => 
      a.name.toLowerCase().includes(interpretation.location!.toLowerCase()) ||
      (a.description && a.description.toLowerCase().includes(interpretation.location!.toLowerCase()))
    );
    suggestions.push(
      ...regionAOIs.slice(0, 2).map(a => `Looking for ${a.name}?`)
    );
  }
  
  // Add general suggestions
  if (suggestions.length === 0) {
    suggestions.push(
      "Try specifying a location (e.g., 'Shanghai port')",
      "Try specifying a facility type (e.g., 'copper mine in Chile')",
      "Try using the facility name directly"
    );
  }
  
  return suggestions.slice(0, 5);
}

/**
 * Batch match multiple queries
 */
export const batchMatchAOIs = action({
  args: {
    queries: v.array(v.string()),
    maxMatchesPerQuery: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<AOIMatchResult[]> => {
    const results: AOIMatchResult[] = [];
    
    for (const query of args.queries) {
      const result = await ctx.runAction(api.matchAOIs.matchAOIsFromText, {
        text: query,
        maxMatches: args.maxMatchesPerQuery || 3,
        useAI: false, // Use fast matching for batch
      });
      results.push(result);
    }
    
    return results;
  },
});

/**
 * Get AOI by exact ID
 */
export const getAOIById = query({
  args: {
    aoiId: v.string(),
  },
  handler: async (ctx, args) => {
    const aoi = await ctx.db
      .query("aoi_catalog")
      .withIndex("by_slug", q => q.eq("slug", args.aoiId))
      .unique();
    
    if (!aoi) return null;
    
    return {
      id: aoi.slug,
      name: aoi.name,
      type: aoi.type,
      bbox: aoi.bbox,
      description: aoi.description,
    };
  },
});

/**
 * Match AOIs based on query parameters
 */
export const matchAOIsWithQuery = query({
  args: {
    locations: v.optional(v.array(v.string())),
    commodities: v.optional(v.array(v.string())),
    types: v.optional(v.array(v.union(
      v.literal("port"),
      v.literal("farm"),
      v.literal("mine"),
      v.literal("energy")
    ))),
    keywords: v.optional(v.array(v.string()))
  },
  handler: async (ctx, args) => {
    const { locations = [], commodities = [], types = [], keywords = [] } = args;
    
    // Get all AOIs from the catalog
    let query = ctx.db.query("aoi_catalog");
    const allAOIs = await query.collect();
    
    // Expand region names to location keywords
    const locationKeywords: string[] = [...locations];
    for (const location of locations) {
      const loc = location.toLowerCase();
      if (loc.includes("southamerica") || loc.includes("south america")) {
        locationKeywords.push("chile", "brazil", "argentina", "peru", "colombia");
      }
      if (loc.includes("northamerica") || loc.includes("north america")) {
        locationKeywords.push("usa", "united states", "america", "canada", "mexico");
      }
      if (loc.includes("europe")) {
        locationKeywords.push("rotterdam", "netherlands", "germany", "france", "spain");
      }
      if (loc.includes("asia")) {
        locationKeywords.push("china", "shanghai", "singapore", "india", "japan");
      }
    }
    
    // Expand commodity keywords
    const commodityKeywords: string[] = [...commodities];
    for (const commodity of commodities) {
      const comm = commodity.toLowerCase();
      if (comm === "farm" || keywords.some(k => k.toLowerCase().includes("soy"))) {
        commodityKeywords.push("soybean", "soy", "agriculture", "corn", "wheat", "grain");
      }
      if (comm === "mine" || keywords.some(k => k.toLowerCase().includes("copper"))) {
        commodityKeywords.push("copper", "iron", "gold", "mining", "ore");
      }
      if (comm === "port" || keywords.some(k => k.toLowerCase().includes("ship"))) {
        commodityKeywords.push("port", "shipping", "container", "export", "import");
      }
    }
    
    // Filter AOIs based on types if provided
    let filteredAOIs = allAOIs;
    if (types.length > 0) {
      filteredAOIs = allAOIs.filter(aoi => types.includes(aoi.type as any));
    }
    
    // Score AOIs based on location and commodity matching
    const scoredAOIs = filteredAOIs.map(aoi => {
      let score = 0;
      const aoiName = aoi.name.toLowerCase();
      const aoiDesc = (aoi.description || "").toLowerCase();
      const aoiText = aoiName + " " + aoiDesc;
      
      // Check location matches with expanded keywords
      for (const location of locationKeywords) {
        const loc = location.toLowerCase();
        if (aoiText.includes(loc)) {
          score += 10;
        }
      }
      
      // Check commodity/domain matches with expanded keywords
      for (const commodity of commodityKeywords) {
        const comm = commodity.toLowerCase();
        if (aoi.type === comm || aoiText.includes(comm)) {
          score += 5;
        }
      }
      
      // Check keyword matches
      for (const keyword of keywords) {
        const kw = keyword.toLowerCase();
        if (aoiText.includes(kw)) {
          score += 3;
        }
      }
      
      // Base score for type match
      if (types.length === 0 || types.includes(aoi.type as any)) {
        score += 1;
      }
      
      // Special handling for specific queries
      if (keywords.some(k => k.toLowerCase().includes("chile")) && 
          keywords.some(k => k.toLowerCase().includes("copper")) &&
          aoiName.includes("escondida")) {
        score += 20; // Boost Escondida mine for Chile copper queries
      }
      
      if (keywords.some(k => k.toLowerCase().includes("soy")) &&
          (aoiName.includes("iowa") || aoiName.includes("central valley"))) {
        score += 15; // Boost relevant farms for soybean queries
      }
      
      return { aoi, score };
    });
    
    // Return AOIs sorted by relevance score
    const results = scoredAOIs
      .filter(s => s.score > 0 || (types.length === 0 && locations.length === 0 && commodities.length === 0))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20) // Limit to top 20 results
      .map(s => ({
        _id: s.aoi._id,
        id: s.aoi.slug,
        name: s.aoi.name,
        type: s.aoi.type,
        bbox: s.aoi.bbox,
        description: s.aoi.description,
        coordinates: s.aoi.bbox ? {
          lat: (s.aoi.bbox[1] + s.aoi.bbox[3]) / 2,
          lng: (s.aoi.bbox[0] + s.aoi.bbox[2]) / 2
        } : undefined,
        relevanceScore: s.score
      }));
    
    console.log(`Matched ${results.length} AOIs for query:`, { locations, commodities, types, keywords });
    return results;
  },
});

/**
 * Search AOIs with fuzzy matching
 */
export const searchAOIs = query({
  args: {
    searchTerm: v.string(),
    type: v.optional(v.union(
      v.literal("port"),
      v.literal("farm"),
      v.literal("mine"),
      v.literal("energy")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { searchTerm, type, limit = 10 } = args;
    const term = searchTerm.toLowerCase();
    
    let query = ctx.db.query("aoi_catalog");
    
    if (type) {
      query = query.withIndex("by_type", q => q.eq("type", type));
    }
    
    const aois = await query.collect();
    
    // Score and filter AOIs
    const scored = aois.map(aoi => {
      let score = 0;
      const name = aoi.name.toLowerCase();
      const desc = (aoi.description || "").toLowerCase();
      
      // Exact match
      if (name === term || aoi.slug === term) score += 10;
      
      // Name contains term
      if (name.includes(term)) score += 5;
      
      // Description contains term
      if (desc.includes(term)) score += 2;
      
      // Word match
      const termWords = term.split(/\s+/);
      const nameWords = name.split(/\s+/);
      const commonWords = termWords.filter(w => nameWords.includes(w));
      score += commonWords.length * 3;
      
      return { aoi, score };
    });
    
    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => ({
        id: s.aoi.slug,
        name: s.aoi.name,
        type: s.aoi.type,
        bbox: s.aoi.bbox,
        description: s.aoi.description,
        relevanceScore: s.score,
      }));
  },
});
