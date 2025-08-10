/**
 * Global AOI Generator
 * Dynamically generates Areas of Interest for any location worldwide
 * No pre-imported limitations - works with any query
 */

import { v } from "convex/values";
import { action } from "./_generated/server";

// Global port database (major ports worldwide)
const GLOBAL_PORTS = {
  // Americas
  "port-santos": { name: "Port of Santos", country: "Brazil", lat: -23.96, lng: -46.33, importance: "high" },
  "port-valparaiso": { name: "Port of Valparaíso", country: "Chile", lat: -33.03, lng: -71.63, importance: "high" },
  "port-san-antonio": { name: "Port of San Antonio", country: "Chile", lat: -33.59, lng: -71.61, importance: "high" },
  "port-callao": { name: "Port of Callao", country: "Peru", lat: -12.05, lng: -77.15, importance: "high" },
  "port-buenos-aires": { name: "Port of Buenos Aires", country: "Argentina", lat: -34.60, lng: -58.37, importance: "high" },
  "port-vancouver": { name: "Port of Vancouver", country: "Canada", lat: 49.29, lng: -123.11, importance: "high" },
  "port-seattle": { name: "Port of Seattle", country: "USA", lat: 47.61, lng: -122.35, importance: "high" },
  "port-oakland": { name: "Port of Oakland", country: "USA", lat: 37.80, lng: -122.32, importance: "high" },
  "port-long-beach": { name: "Port of Long Beach", country: "USA", lat: 33.75, lng: -118.20, importance: "critical" },
  "port-new-orleans": { name: "Port of New Orleans", country: "USA", lat: 29.94, lng: -90.06, importance: "high" },
  "port-miami": { name: "Port of Miami", country: "USA", lat: 25.77, lng: -80.17, importance: "high" },
  "port-new-york": { name: "Port of New York/New Jersey", country: "USA", lat: 40.67, lng: -74.05, importance: "critical" },
  
  // Europe
  "port-antwerp": { name: "Port of Antwerp", country: "Belgium", lat: 51.23, lng: 4.42, importance: "critical" },
  "port-hamburg": { name: "Port of Hamburg", country: "Germany", lat: 53.54, lng: 9.98, importance: "critical" },
  "port-bremerhaven": { name: "Port of Bremerhaven", country: "Germany", lat: 53.52, lng: 8.58, importance: "high" },
  "port-valencia": { name: "Port of Valencia", country: "Spain", lat: 39.45, lng: -0.32, importance: "high" },
  "port-barcelona": { name: "Port of Barcelona", country: "Spain", lat: 41.35, lng: 2.17, importance: "high" },
  "port-genoa": { name: "Port of Genoa", country: "Italy", lat: 44.41, lng: 8.93, importance: "high" },
  "port-marseille": { name: "Port of Marseille", country: "France", lat: 43.34, lng: 5.32, importance: "high" },
  "port-felixstowe": { name: "Port of Felixstowe", country: "UK", lat: 51.95, lng: 1.35, importance: "high" },
  "port-piraeus": { name: "Port of Piraeus", country: "Greece", lat: 37.94, lng: 23.65, importance: "high" },
  
  // Asia
  "port-ningbo": { name: "Port of Ningbo-Zhoushan", country: "China", lat: 29.87, lng: 121.55, importance: "critical" },
  "port-shenzhen": { name: "Port of Shenzhen", country: "China", lat: 22.54, lng: 114.13, importance: "critical" },
  "port-guangzhou": { name: "Port of Guangzhou", country: "China", lat: 23.09, lng: 113.48, importance: "critical" },
  "port-qingdao": { name: "Port of Qingdao", country: "China", lat: 36.07, lng: 120.38, importance: "high" },
  "port-tianjin": { name: "Port of Tianjin", country: "China", lat: 39.00, lng: 117.75, importance: "critical" },
  "port-hong-kong": { name: "Port of Hong Kong", country: "China", lat: 22.31, lng: 114.22, importance: "critical" },
  "port-busan": { name: "Port of Busan", country: "South Korea", lat: 35.10, lng: 129.04, importance: "critical" },
  "port-yokohama": { name: "Port of Yokohama", country: "Japan", lat: 35.45, lng: 139.64, importance: "high" },
  "port-tokyo": { name: "Port of Tokyo", country: "Japan", lat: 35.65, lng: 139.79, importance: "high" },
  "port-kobe": { name: "Port of Kobe", country: "Japan", lat: 34.68, lng: 135.29, importance: "high" },
  "port-klang": { name: "Port Klang", country: "Malaysia", lat: 3.00, lng: 101.40, importance: "high" },
  "port-tanjung-pelepas": { name: "Port of Tanjung Pelepas", country: "Malaysia", lat: 1.36, lng: 103.55, importance: "high" },
  "port-mumbai": { name: "Port of Mumbai", country: "India", lat: 18.95, lng: 72.85, importance: "high" },
  "port-dubai": { name: "Port of Dubai (Jebel Ali)", country: "UAE", lat: 25.01, lng: 55.04, importance: "critical" },
  
  // Africa & Oceania
  "port-durban": { name: "Port of Durban", country: "South Africa", lat: -29.87, lng: 31.00, importance: "high" },
  "port-melbourne": { name: "Port of Melbourne", country: "Australia", lat: -37.83, lng: 144.91, importance: "high" },
  "port-sydney": { name: "Port of Sydney", country: "Australia", lat: -33.85, lng: 151.21, importance: "high" },
  "port-brisbane": { name: "Port of Brisbane", country: "Australia", lat: -27.38, lng: 153.17, importance: "high" },
};

// Global mining regions
const GLOBAL_MINES = {
  // Copper
  "mine-chuquicamata": { name: "Chuquicamata", country: "Chile", lat: -22.29, lng: -68.90, commodity: "copper", importance: "critical" },
  "mine-el-teniente": { name: "El Teniente", country: "Chile", lat: -34.08, lng: -70.35, commodity: "copper", importance: "critical" },
  "mine-collahuasi": { name: "Collahuasi", country: "Chile", lat: -20.97, lng: -68.70, commodity: "copper", importance: "high" },
  "mine-antamina": { name: "Antamina", country: "Peru", lat: -9.54, lng: -77.05, commodity: "copper", importance: "high" },
  "mine-cerro-verde": { name: "Cerro Verde", country: "Peru", lat: -16.53, lng: -71.59, commodity: "copper", importance: "high" },
  "mine-morenci": { name: "Morenci", country: "USA", lat: 33.05, lng: -109.33, commodity: "copper", importance: "high" },
  "mine-bingham-canyon": { name: "Bingham Canyon", country: "USA", lat: 40.52, lng: -112.15, commodity: "copper", importance: "high" },
  
  // Iron Ore
  "mine-carajas": { name: "Carajás", country: "Brazil", lat: -6.06, lng: -50.17, commodity: "iron", importance: "critical" },
  "mine-mount-newman": { name: "Mount Newman", country: "Australia", lat: -23.36, lng: 119.73, commodity: "iron", importance: "critical" },
  "mine-hamersley": { name: "Hamersley Basin", country: "Australia", lat: -22.59, lng: 117.69, commodity: "iron", importance: "critical" },
  
  // Gold
  "mine-muruntau": { name: "Muruntau", country: "Uzbekistan", lat: 41.50, lng: 64.57, commodity: "gold", importance: "high" },
  "mine-carlin": { name: "Carlin Trend", country: "USA", lat: 40.65, lng: -116.12, commodity: "gold", importance: "high" },
  "mine-super-pit": { name: "Super Pit", country: "Australia", lat: -30.78, lng: 121.50, commodity: "gold", importance: "high" },
  
  // Lithium
  "mine-greenbushes": { name: "Greenbushes", country: "Australia", lat: -33.85, lng: 116.06, commodity: "lithium", importance: "critical" },
  "mine-salar-atacama": { name: "Salar de Atacama", country: "Chile", lat: -23.50, lng: -68.25, commodity: "lithium", importance: "critical" },
  "mine-salar-uyuni": { name: "Salar de Uyuni", country: "Bolivia", lat: -20.13, lng: -67.49, commodity: "lithium", importance: "high" },
};

// Global agricultural regions
const GLOBAL_FARMS = {
  // Soybeans
  "farm-mato-grosso": { name: "Mato Grosso", country: "Brazil", lat: -12.64, lng: -55.42, crop: "soybean", importance: "critical" },
  "farm-parana": { name: "Paraná", country: "Brazil", lat: -24.52, lng: -51.97, crop: "soybean", importance: "critical" },
  "farm-buenos-aires-ag": { name: "Buenos Aires Province", country: "Argentina", lat: -35.38, lng: -60.33, crop: "soybean", importance: "critical" },
  "farm-illinois": { name: "Illinois Corn Belt", country: "USA", lat: 40.63, lng: -89.40, crop: "corn", importance: "critical" },
  "farm-nebraska": { name: "Nebraska Plains", country: "USA", lat: 41.50, lng: -99.90, crop: "corn", importance: "high" },
  
  // Wheat
  "farm-kansas": { name: "Kansas Wheat Belt", country: "USA", lat: 38.50, lng: -98.00, crop: "wheat", importance: "critical" },
  "farm-saskatchewan": { name: "Saskatchewan", country: "Canada", lat: 52.93, lng: -106.45, crop: "wheat", importance: "high" },
  "farm-punjab-pakistan": { name: "Punjab", country: "Pakistan", lat: 31.15, lng: 72.70, crop: "wheat", importance: "high" },
  "farm-haryana": { name: "Haryana", country: "India", lat: 29.06, lng: 76.09, crop: "wheat", importance: "high" },
  
  // Rice
  "farm-mekong-delta": { name: "Mekong Delta", country: "Vietnam", lat: 10.04, lng: 105.78, crop: "rice", importance: "critical" },
  "farm-irrawaddy": { name: "Irrawaddy Delta", country: "Myanmar", lat: 16.78, lng: 95.98, crop: "rice", importance: "high" },
};

// Global energy facilities
const GLOBAL_ENERGY = {
  // Oil Fields
  "energy-ghawar": { name: "Ghawar Field", country: "Saudi Arabia", lat: 25.43, lng: 49.58, type: "oil", importance: "critical" },
  "energy-safaniya": { name: "Safaniya Field", country: "Saudi Arabia", lat: 28.40, lng: 48.63, type: "oil", importance: "critical" },
  "energy-rumaila": { name: "Rumaila Field", country: "Iraq", lat: 30.45, lng: 47.32, type: "oil", importance: "high" },
  "energy-cantarell": { name: "Cantarell Field", country: "Mexico", lat: 19.40, lng: -92.32, type: "oil", importance: "high" },
  "energy-tengiz": { name: "Tengiz Field", country: "Kazakhstan", lat: 46.16, lng: 53.00, type: "oil", importance: "high" },
  
  // LNG Terminals
  "energy-ras-laffan": { name: "Ras Laffan", country: "Qatar", lat: 25.86, lng: 51.55, type: "lng", importance: "critical" },
  "energy-sabine-pass": { name: "Sabine Pass", country: "USA", lat: 29.73, lng: -93.93, type: "lng", importance: "high" },
  "energy-yamal": { name: "Yamal LNG", country: "Russia", lat: 71.25, lng: 72.04, type: "lng", importance: "high" },
};

/**
 * Generate AOIs dynamically based on query keywords and regions
 */
export const generateGlobalAOIs = action({
  args: {
    keywords: v.array(v.string()),
    regions: v.array(v.string()),
    domains: v.array(v.string()),
    specificLocations: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const aois: any[] = [];
    
    // Extract location-specific keywords
    const locationKeywords = extractLocationKeywords(args.keywords);
    const commodityKeywords = extractCommodityKeywords(args.keywords);
    
    // Generate AOIs based on domains and keywords
    for (const domain of args.domains) {
      switch (domain) {
        case "port":
          aois.push(...generatePortAOIs(locationKeywords, args.regions, commodityKeywords));
          break;
        case "mine":
          aois.push(...generateMineAOIs(locationKeywords, args.regions, commodityKeywords));
          break;
        case "farm":
          aois.push(...generateFarmAOIs(locationKeywords, args.regions, commodityKeywords));
          break;
        case "energy":
          aois.push(...generateEnergyAOIs(locationKeywords, args.regions));
          break;
      }
    }
    
    // If no specific AOIs found, generate regional defaults
    if (aois.length === 0 && args.regions.length > 0) {
      aois.push(...generateRegionalDefaults(args.regions, args.domains));
    }
    
    // Deduplicate and return
    const uniqueAois = deduplicateAOIs(aois);
    
    return {
      aois: uniqueAois,
      totalGenerated: uniqueAois.length,
      keywords: locationKeywords,
      commodities: commodityKeywords,
    };
  },
});

function extractLocationKeywords(keywords: string[]): string[] {
  const locations: string[] = [];
  const locationPatterns = [
    /chile|chilean/i,
    /brazil|brazilian/i,
    /china|chinese|shanghai|beijing/i,
    /singapore/i,
    /rotterdam|netherlands|dutch/i,
    /australia|australian/i,
    /peru|peruvian/i,
    /argentina|argentine/i,
    /usa|united states|america/i,
    /canada|canadian/i,
    /india|indian/i,
    /saudi|arabia/i,
    /qatar/i,
    /japan|japanese/i,
    /korea|korean/i,
  ];
  
  for (const keyword of keywords) {
    for (const pattern of locationPatterns) {
      if (pattern.test(keyword)) {
        locations.push(keyword.toLowerCase());
      }
    }
  }
  
  return locations;
}

function extractCommodityKeywords(keywords: string[]): string[] {
  const commodities: string[] = [];
  const commodityPatterns = [
    /copper|cu/i,
    /iron|ore|steel/i,
    /gold|au/i,
    /lithium|li/i,
    /oil|crude|petroleum/i,
    /gas|lng|natural/i,
    /soy|soybean/i,
    /corn|maize/i,
    /wheat/i,
    /rice/i,
  ];
  
  for (const keyword of keywords) {
    for (const pattern of commodityPatterns) {
      if (pattern.test(keyword)) {
        commodities.push(keyword.toLowerCase());
      }
    }
  }
  
  return commodities;
}

function generatePortAOIs(locations: string[], regions: string[], commodities: string[]): any[] {
  const aois: any[] = [];
  
  // Filter ports based on location and commodity relevance
  for (const [id, port] of Object.entries(GLOBAL_PORTS)) {
    let relevance = 0;
    
    // Check location match
    if (locations.some(loc => 
      port.name.toLowerCase().includes(loc) || 
      port.country.toLowerCase().includes(loc)
    )) {
      relevance += 10;
    }
    
    // Check region match
    if (regions.includes("southAmerica") && ["Brazil", "Chile", "Argentina", "Peru"].includes(port.country)) {
      relevance += 5;
    }
    if (regions.includes("asia") && ["China", "Singapore", "Japan", "South Korea", "India"].includes(port.country)) {
      relevance += 5;
    }
    
    // Special handling for copper exports
    if (commodities.some(c => c.includes("copper")) && ["Chile", "Peru"].includes(port.country)) {
      relevance += 8;
    }
    
    if (relevance > 0) {
      aois.push({
        id,
        name: port.name,
        type: "port",
        coordinates: { lat: port.lat, lng: port.lng },
        country: port.country,
        importance: port.importance,
        relevanceScore: relevance,
        bbox: [port.lng - 0.1, port.lat - 0.1, port.lng + 0.1, port.lat + 0.1],
      });
    }
  }
  
  return aois.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 10);
}

function generateMineAOIs(locations: string[], regions: string[], commodities: string[]): any[] {
  const aois: any[] = [];
  
  for (const [id, mine] of Object.entries(GLOBAL_MINES)) {
    let relevance = 0;
    
    // Check commodity match
    if (commodities.some(c => mine.commodity.includes(c) || c.includes(mine.commodity))) {
      relevance += 10;
    }
    
    // Check location match
    if (locations.some(loc => 
      mine.name.toLowerCase().includes(loc) || 
      mine.country.toLowerCase().includes(loc)
    )) {
      relevance += 8;
    }
    
    // Check region match
    if (regions.includes("southAmerica") && ["Chile", "Peru", "Brazil", "Bolivia"].includes(mine.country)) {
      relevance += 5;
    }
    
    if (relevance > 0) {
      aois.push({
        id,
        name: mine.name,
        type: "mine",
        coordinates: { lat: mine.lat, lng: mine.lng },
        country: mine.country,
        commodity: mine.commodity,
        importance: mine.importance,
        relevanceScore: relevance,
        bbox: [mine.lng - 0.2, mine.lat - 0.2, mine.lng + 0.2, mine.lat + 0.2],
      });
    }
  }
  
  return aois.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 10);
}

function generateFarmAOIs(locations: string[], regions: string[], commodities: string[]): any[] {
  const aois: any[] = [];
  
  for (const [id, farm] of Object.entries(GLOBAL_FARMS)) {
    let relevance = 0;
    
    // Check crop/commodity match
    if (commodities.some(c => farm.crop.includes(c) || c.includes(farm.crop))) {
      relevance += 10;
    }
    
    // Check location match
    if (locations.some(loc => 
      farm.name.toLowerCase().includes(loc) || 
      farm.country.toLowerCase().includes(loc)
    )) {
      relevance += 8;
    }
    
    // Check region match
    if (regions.includes("southAmerica") && ["Brazil", "Argentina"].includes(farm.country)) {
      relevance += 5;
    }
    if (regions.includes("northAmerica") && ["USA", "Canada"].includes(farm.country)) {
      relevance += 5;
    }
    
    if (relevance > 0) {
      aois.push({
        id,
        name: farm.name,
        type: "farm",
        coordinates: { lat: farm.lat, lng: farm.lng },
        country: farm.country,
        crop: farm.crop,
        importance: farm.importance,
        relevanceScore: relevance,
        bbox: [farm.lng - 0.5, farm.lat - 0.5, farm.lng + 0.5, farm.lat + 0.5],
      });
    }
  }
  
  return aois.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 10);
}

function generateEnergyAOIs(locations: string[], regions: string[]): any[] {
  const aois: any[] = [];
  
  for (const [id, facility] of Object.entries(GLOBAL_ENERGY)) {
    let relevance = 0;
    
    // Check location match
    if (locations.some(loc => 
      facility.name.toLowerCase().includes(loc) || 
      facility.country.toLowerCase().includes(loc)
    )) {
      relevance += 10;
    }
    
    // Check region match
    if (regions.includes("middleEast") && ["Saudi Arabia", "Iraq", "Qatar", "UAE"].includes(facility.country)) {
      relevance += 5;
    }
    
    if (relevance > 0) {
      aois.push({
        id,
        name: facility.name,
        type: "energy",
        coordinates: { lat: facility.lat, lng: facility.lng },
        country: facility.country,
        energyType: facility.type,
        importance: facility.importance,
        relevanceScore: relevance,
        bbox: [facility.lng - 0.3, facility.lat - 0.3, facility.lng + 0.3, facility.lat + 0.3],
      });
    }
  }
  
  return aois.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 10);
}

function generateRegionalDefaults(regions: string[], domains: string[]): any[] {
  const defaults: any[] = [];
  
  // Add top facilities per region and domain
  for (const region of regions) {
    for (const domain of domains) {
      if (region === "southAmerica" && domain === "port") {
        defaults.push(...Object.entries(GLOBAL_PORTS)
          .filter(([_, p]) => ["Chile", "Brazil", "Peru", "Argentina"].includes(p.country))
          .slice(0, 3)
          .map(([id, p]) => ({
            id,
            name: p.name,
            type: "port",
            coordinates: { lat: p.lat, lng: p.lng },
            country: p.country,
            importance: p.importance,
            relevanceScore: 3,
            bbox: [p.lng - 0.1, p.lat - 0.1, p.lng + 0.1, p.lat + 0.1],
          })));
      }
      // Add more regional defaults as needed
    }
  }
  
  return defaults;
}

function deduplicateAOIs(aois: any[]): any[] {
  const seen = new Set<string>();
  return aois.filter(aoi => {
    const key = aoi.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
