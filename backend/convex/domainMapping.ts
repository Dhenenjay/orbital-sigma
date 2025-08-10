/**
 * Domain Mapping System
 * Maps keywords, phrases, and concepts to satellite monitoring domains
 */

import { v } from "convex/values";
import { query, action } from "./_generated/server";

// Domain type definition
export type Domain = "port" | "farm" | "mine" | "energy";

/**
 * Comprehensive keyword mapping to domains
 * Each domain has categories of related terms
 */
export const DOMAIN_MAPPINGS = {
  port: {
    // Direct port-related terms
    primary: [
      "port", "ports", "harbor", "harbors", "harbour", "harbours",
      "terminal", "terminals", "wharf", "wharves", "pier", "piers",
      "dock", "docks", "berth", "berths", "quay", "quays"
    ],
    
    // Shipping and maritime terms
    shipping: [
      "shipping", "vessel", "vessels", "ship", "ships", "boat", "boats",
      "cargo", "container", "containers", "freight", "maritime",
      "nautical", "naval", "marine", "ocean", "sea", "seaport",
      "shipyard", "tanker", "tankers", "bulk carrier", "carrier"
    ],
    
    // Logistics and trade
    logistics: [
      "logistics", "supply chain", "import", "imports", "export", "exports",
      "trade", "trading", "transshipment", "transit", "customs",
      "clearance", "warehousing", "distribution", "hub", "gateway"
    ],
    
    // Port operations
    operations: [
      "loading", "unloading", "discharge", "berthing", "mooring",
      "stevedoring", "pilotage", "tugboat", "crane", "cranes",
      "congestion", "queue", "queuing", "waiting", "anchorage",
      "throughput", "capacity", "utilization", "turnaround"
    ],
    
    // Types of cargo
    cargo_types: [
      "containerized", "bulk", "breakbulk", "ro-ro", "reefer",
      "liquid bulk", "dry bulk", "general cargo", "project cargo",
      "teu", "feu", "twenty-foot", "forty-foot"
    ]
  },
  
  farm: {
    // Agricultural terms
    primary: [
      "farm", "farms", "farming", "agriculture", "agricultural",
      "agro", "agri", "cultivation", "plantation", "plantations",
      "ranch", "ranches", "ranching", "estate", "estates"
    ],
    
    // Crops and grains
    crops: [
      "crop", "crops", "grain", "grains", "cereal", "cereals",
      "wheat", "corn", "maize", "rice", "barley", "oats", "rye",
      "soybean", "soybeans", "soy", "canola", "rapeseed",
      "sunflower", "cotton", "sugarcane", "sugar", "coffee",
      "cocoa", "tea", "tobacco", "palm", "rubber"
    ],
    
    // Farming activities
    activities: [
      "harvest", "harvesting", "planting", "sowing", "seeding",
      "tillage", "plowing", "ploughing", "irrigation", "irrigating",
      "fertilization", "fertilizing", "spraying", "cultivation",
      "threshing", "reaping", "growing", "yield", "production"
    ],
    
    // Agricultural land types
    land_types: [
      "field", "fields", "cropland", "farmland", "arable",
      "paddy", "paddies", "orchard", "orchards", "vineyard",
      "vineyards", "pasture", "pastures", "meadow", "meadows",
      "grassland", "prairie", "plantation", "grove", "groves"
    ],
    
    // Livestock and dairy
    livestock: [
      "livestock", "cattle", "cow", "cows", "beef", "dairy",
      "poultry", "chicken", "chickens", "pig", "pigs", "pork",
      "sheep", "lamb", "goat", "goats", "aquaculture", "fishery"
    ],
    
    // Agricultural infrastructure
    infrastructure: [
      "silo", "silos", "barn", "barns", "greenhouse", "greenhouses",
      "warehouse", "storage", "granary", "elevator", "mill",
      "processing", "packing", "cold storage", "feedlot"
    ]
  },
  
  mine: {
    // Mining terms
    primary: [
      "mine", "mines", "mining", "miner", "miners", "extraction",
      "excavation", "quarry", "quarries", "quarrying", "pit",
      "pits", "digging", "mineral", "minerals", "ore", "ores"
    ],
    
    // Metals and minerals
    metals: [
      "copper", "iron", "gold", "silver", "platinum", "palladium",
      "aluminum", "aluminium", "bauxite", "zinc", "lead", "tin",
      "nickel", "cobalt", "lithium", "tungsten", "molybdenum",
      "uranium", "thorium", "rare earth", "ree", "titanium"
    ],
    
    // Mining types
    types: [
      "opencast", "open-pit", "open pit", "underground", "surface",
      "strip", "placer", "mountaintop", "dredging", "solution",
      "in-situ", "hardrock", "soft rock", "alluvial", "shaft"
    ],
    
    // Mining operations
    operations: [
      "drilling", "blasting", "hauling", "crushing", "grinding",
      "milling", "processing", "beneficiation", "concentration",
      "flotation", "leaching", "smelting", "refining", "tailings",
      "overburden", "stripping", "excavating", "loading"
    ],
    
    // Mining infrastructure
    infrastructure: [
      "headframe", "shaft", "adit", "tunnel", "conveyor",
      "crusher", "mill", "concentrator", "smelter", "refinery",
      "tailings pond", "waste dump", "stockpile", "heap leach"
    ],
    
    // Gemstones and materials
    materials: [
      "diamond", "diamonds", "emerald", "ruby", "sapphire",
      "coal", "limestone", "granite", "marble", "sand", "gravel",
      "clay", "phosphate", "potash", "salt", "gypsum"
    ]
  },
  
  energy: {
    // Energy sector terms
    primary: [
      "energy", "power", "electricity", "utility", "utilities",
      "generation", "production", "plant", "plants", "station",
      "stations", "facility", "facilities", "grid", "infrastructure"
    ],
    
    // Oil and gas
    oil_gas: [
      "oil", "petroleum", "crude", "gas", "natural gas", "lng",
      "lpg", "gasoline", "petrol", "diesel", "fuel", "kerosene",
      "refinery", "refineries", "refining", "cracking", "distillation",
      "pipeline", "pipelines", "drilling", "rig", "rigs", "well",
      "wells", "offshore", "onshore", "fracking", "shale", "tar sands"
    ],
    
    // Renewable energy
    renewable: [
      "renewable", "solar", "photovoltaic", "pv", "wind", "turbine",
      "turbines", "hydro", "hydroelectric", "hydropower", "dam",
      "dams", "geothermal", "biomass", "biofuel", "ethanol",
      "biodiesel", "tidal", "wave", "green energy", "clean energy"
    ],
    
    // Nuclear energy
    nuclear: [
      "nuclear", "reactor", "reactors", "uranium", "enrichment",
      "fission", "fusion", "atomic", "radioactive", "cooling tower",
      "containment", "fuel rod", "spent fuel", "reprocessing"
    ],
    
    // Coal and thermal
    thermal: [
      "coal", "thermal", "fossil fuel", "combustion", "boiler",
      "steam", "turbine", "generator", "smokestack", "chimney",
      "ash pond", "coal yard", "conveyor", "pulverizer"
    ],
    
    // Energy infrastructure
    infrastructure: [
      "substation", "transformer", "transmission", "distribution",
      "voltage", "megawatt", "gigawatt", "capacity", "load",
      "storage", "battery", "batteries", "peaker", "baseload",
      "interconnection", "blackout", "outage"
    ]
  }
};

/**
 * Commodity and market terms that map to domains
 */
export const COMMODITY_DOMAIN_MAP: Record<string, Domain> = {
  // Agricultural commodities → farm
  "wheat": "farm",
  "corn": "farm",
  "soybeans": "farm",
  "rice": "farm",
  "cotton": "farm",
  "sugar": "farm",
  "coffee": "farm",
  "cocoa": "farm",
  
  // Metals → mine
  "copper": "mine",
  "gold": "mine",
  "silver": "mine",
  "iron ore": "mine",
  "aluminum": "mine",
  "zinc": "mine",
  "nickel": "mine",
  "lithium": "mine",
  
  // Energy commodities → energy
  "crude oil": "energy",
  "brent": "energy",
  "wti": "energy",
  "natural gas": "energy",
  "gasoline": "energy",
  "heating oil": "energy",
  "uranium": "energy",
  "coal": "energy",
  
  // Shipping → port
  "freight": "port",
  "baltic dry": "port",
  "tanker rates": "port",
  "container rates": "port"
};

/**
 * Industry sectors that map to domains
 */
export const SECTOR_DOMAIN_MAP: Record<string, Domain> = {
  // Shipping and logistics
  "shipping": "port",
  "logistics": "port",
  "maritime": "port",
  "transportation": "port",
  
  // Agricultural
  "agriculture": "farm",
  "agribusiness": "farm",
  "food production": "farm",
  "farming": "farm",
  
  // Mining
  "mining": "mine",
  "metals": "mine",
  "materials": "mine",
  "extraction": "mine",
  
  // Energy
  "oil & gas": "energy",
  "utilities": "energy",
  "power generation": "energy",
  "renewables": "energy"
};

/**
 * Map a single word or phrase to domains with confidence scores
 */
export function mapWordToDomains(word: string): Array<{ domain: Domain; confidence: number }> {
  const normalizedWord = word.toLowerCase().trim();
  const results: Array<{ domain: Domain; confidence: number }> = [];
  
  // Check each domain's mappings
  for (const [domain, categories] of Object.entries(DOMAIN_MAPPINGS)) {
    let maxConfidence = 0;
    
    // Check primary terms (highest confidence)
    if (categories.primary.some(term => normalizedWord.includes(term))) {
      maxConfidence = Math.max(maxConfidence, 0.95);
    }
    
    // Check other categories
    for (const [category, terms] of Object.entries(categories)) {
      if (category === 'primary') continue;
      
      if (terms.some((term: string) => normalizedWord.includes(term))) {
        // Different confidence levels for different categories
        const categoryConfidence = {
          // Port categories
          shipping: 0.85,
          logistics: 0.75,
          operations: 0.80,
          cargo_types: 0.70,
          
          // Farm categories
          crops: 0.90,
          activities: 0.80,
          land_types: 0.75,
          livestock: 0.85,
          infrastructure: 0.70,
          
          // Mine categories
          metals: 0.90,
          types: 0.85,
          materials: 0.85,
          
          // Energy categories
          oil_gas: 0.90,
          renewable: 0.90,
          nuclear: 0.95,
          thermal: 0.85,
        }[category] || 0.70;
        
        maxConfidence = Math.max(maxConfidence, categoryConfidence);
      }
    }
    
    if (maxConfidence > 0) {
      results.push({ domain: domain as Domain, confidence: maxConfidence });
    }
  }
  
  // Check commodity mappings
  for (const [commodity, domain] of Object.entries(COMMODITY_DOMAIN_MAP)) {
    if (normalizedWord.includes(commodity)) {
      const existing = results.find(r => r.domain === domain);
      if (existing) {
        existing.confidence = Math.max(existing.confidence, 0.90);
      } else {
        results.push({ domain, confidence: 0.90 });
      }
    }
  }
  
  // Check sector mappings
  for (const [sector, domain] of Object.entries(SECTOR_DOMAIN_MAP)) {
    if (normalizedWord.includes(sector)) {
      const existing = results.find(r => r.domain === domain);
      if (existing) {
        existing.confidence = Math.max(existing.confidence, 0.85);
      } else {
        results.push({ domain, confidence: 0.85 });
      }
    }
  }
  
  // Sort by confidence
  results.sort((a, b) => b.confidence - a.confidence);
  
  return results;
}

/**
 * Map text to domains, analyzing all words and context
 */
export function mapTextToDomains(text: string): Array<{ domain: Domain; confidence: number; keywords: string[] }> {
  const normalizedText = text.toLowerCase();
  const domainScores: Record<Domain, { score: number; keywords: Set<string> }> = {
    port: { score: 0, keywords: new Set() },
    farm: { score: 0, keywords: new Set() },
    mine: { score: 0, keywords: new Set() },
    energy: { score: 0, keywords: new Set() }
  };
  
  // Check all domain mappings
  for (const [domain, categories] of Object.entries(DOMAIN_MAPPINGS)) {
    for (const [category, terms] of Object.entries(categories)) {
      const weight = category === 'primary' ? 2.0 : 1.0;
      
      for (const term of terms as string[]) {
        if (normalizedText.includes(term)) {
          domainScores[domain as Domain].score += weight;
          domainScores[domain as Domain].keywords.add(term);
        }
      }
    }
  }
  
  // Check commodity mappings
  for (const [commodity, domain] of Object.entries(COMMODITY_DOMAIN_MAP)) {
    if (normalizedText.includes(commodity)) {
      domainScores[domain].score += 1.5;
      domainScores[domain].keywords.add(commodity);
    }
  }
  
  // Check sector mappings
  for (const [sector, domain] of Object.entries(SECTOR_DOMAIN_MAP)) {
    if (normalizedText.includes(sector)) {
      domainScores[domain].score += 1.5;
      domainScores[domain].keywords.add(sector);
    }
  }
  
  // Convert scores to confidence and filter
  const results: Array<{ domain: Domain; confidence: number; keywords: string[] }> = [];
  const maxScore = Math.max(...Object.values(domainScores).map(d => d.score));
  
  for (const [domain, data] of Object.entries(domainScores)) {
    if (data.score > 0) {
      const confidence = Math.min(0.95, data.score / (maxScore || 1));
      results.push({
        domain: domain as Domain,
        confidence,
        keywords: Array.from(data.keywords)
      });
    }
  }
  
  // Sort by confidence
  results.sort((a, b) => b.confidence - a.confidence);
  
  return results;
}

/**
 * Get all keywords for a specific domain
 */
export function getDomainKeywords(domain: Domain): string[] {
  const keywords: Set<string> = new Set();
  const domainData = DOMAIN_MAPPINGS[domain];
  
  if (!domainData) return [];
  
  for (const category of Object.values(domainData)) {
    for (const term of category) {
      keywords.add(term);
    }
  }
  
  // Add commodities
  for (const [commodity, d] of Object.entries(COMMODITY_DOMAIN_MAP)) {
    if (d === domain) keywords.add(commodity);
  }
  
  // Add sectors
  for (const [sector, d] of Object.entries(SECTOR_DOMAIN_MAP)) {
    if (d === domain) keywords.add(sector);
  }
  
  return Array.from(keywords).sort();
}

/**
 * Check if a word strongly indicates a specific domain
 */
export function isStrongDomainIndicator(word: string, domain: Domain): boolean {
  const normalized = word.toLowerCase().trim();
  const domainData = DOMAIN_MAPPINGS[domain];
  
  // Check primary terms
  if (domainData.primary.includes(normalized)) {
    return true;
  }
  
  // Check if it's a key commodity for this domain
  if (COMMODITY_DOMAIN_MAP[normalized] === domain) {
    return true;
  }
  
  // Check specific strong indicators per domain
  const strongIndicators: Record<Domain, string[]> = {
    port: ["shipping", "vessel", "container", "maritime", "cargo"],
    farm: ["agriculture", "crop", "harvest", "farming", "grain"],
    mine: ["mining", "copper", "gold", "extraction", "ore"],
    energy: ["oil", "gas", "power", "electricity", "refinery"]
  };
  
  return strongIndicators[domain].includes(normalized);
}

/**
 * Action to map text to domains
 */
export const mapToDomains = action({
  args: {
    text: v.string(),
    returnKeywords: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const results = mapTextToDomains(args.text);
    
    if (!args.returnKeywords) {
      return results.map(r => ({
        domain: r.domain,
        confidence: r.confidence
      }));
    }
    
    return results;
  },
});

/**
 * Query to get domain keywords
 */
export const getDomainKeywordsQuery = query({
  args: {
    domain: v.union(
      v.literal("port"),
      v.literal("farm"),
      v.literal("mine"),
      v.literal("energy")
    ),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const domainData = DOMAIN_MAPPINGS[args.domain];
    
    if (args.category && args.category in domainData) {
      return domainData[args.category as keyof typeof domainData];
    }
    
    return getDomainKeywords(args.domain);
  },
});

/**
 * Suggest domain based on context
 */
export const suggestDomain = action({
  args: {
    words: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const domainVotes: Record<Domain, number> = {
      port: 0,
      farm: 0,
      mine: 0,
      energy: 0
    };
    
    for (const word of args.words) {
      const mappings = mapWordToDomains(word);
      for (const mapping of mappings) {
        domainVotes[mapping.domain] += mapping.confidence;
      }
    }
    
    // Find the domain with highest votes
    let bestDomain: Domain = "port";
    let maxVotes = 0;
    
    for (const [domain, votes] of Object.entries(domainVotes)) {
      if (votes > maxVotes) {
        maxVotes = votes;
        bestDomain = domain as Domain;
      }
    }
    
    return {
      suggestedDomain: bestDomain,
      confidence: maxVotes / args.words.length,
      scores: domainVotes
    };
  },
});

/**
 * Check if text mentions multiple domains
 */
export function detectMultipleDomains(text: string): {
  domains: Domain[];
  primary: Domain | null;
  isMultiDomain: boolean;
} {
  const mappings = mapTextToDomains(text);
  const significantDomains = mappings.filter(m => m.confidence > 0.3);
  
  return {
    domains: significantDomains.map(d => d.domain),
    primary: significantDomains.length > 0 ? significantDomains[0].domain : null,
    isMultiDomain: significantDomains.length > 1 && 
                   significantDomains[1].confidence > significantDomains[0].confidence * 0.7
  };
}

/**
 * Get domain from common abbreviations
 */
export const DOMAIN_ABBREVIATIONS: Record<string, Domain> = {
  // Port abbreviations
  "prt": "port",
  "hbr": "port",
  "shp": "port",
  "mar": "port",
  
  // Farm abbreviations
  "agr": "farm",
  "frm": "farm",
  "agri": "farm",
  "crp": "farm",
  
  // Mine abbreviations
  "min": "mine",
  "mng": "mine",
  "ext": "mine",
  "qry": "mine",
  
  // Energy abbreviations
  "enr": "energy",
  "pwr": "energy",
  "elec": "energy",
  "nrg": "energy",
  "o&g": "energy",
};
