import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Import seed data directly (for development)
export const importData = mutation({
  args: {},
  handler: async (ctx) => {
    // Import the seed data
    const seedData = {
      aois: [
        {
          id: "port-los-angeles",
          name: "Port of Los Angeles",
          type: "port" as const,
          bbox: [-118.29, 33.72, -118.24, 33.77],
          description: "Major U.S. container port in San Pedro Bay, Los Angeles, CA."
        },
        {
          id: "port-singapore",
          name: "Port of Singapore",
          type: "port" as const,
          bbox: [103.60, 1.22, 104.04, 1.32],
          description: "World's second busiest container port, critical Asia-Pacific transshipment hub."
        },
        {
          id: "port-shanghai-yangshan",
          name: "Port of Shanghai (Yangshan Deep-Water)",
          type: "port" as const,
          bbox: [121.90, 30.53, 122.12, 30.75],
          description: "One of the world's busiest container ports located on offshore islands south of Shanghai."
        },
        {
          id: "port-rotterdam",
          name: "Port of Rotterdam",
          type: "port" as const,
          bbox: [4.02, 51.88, 4.33, 51.99],
          description: "Europe's largest seaport spanning the North Sea coastline and Maasvlakte."
        },
        {
          id: "farm-iowa-cornbelt",
          name: "Iowa Corn Belt (Sample)",
          type: "farm" as const,
          bbox: [-94.5, 41.5, -93.0, 42.5],
          description: "Row-crop agriculture area representative of the U.S. Corn Belt."
        },
        {
          id: "farm-central-valley",
          name: "California Central Valley Farm Block",
          type: "farm" as const,
          bbox: [-120.5, 36.0, -119.5, 37.0],
          description: "Highly productive irrigated farmland in California's Central Valley."
        },
        {
          id: "farm-punjab-wheat",
          name: "Punjab Wheat Belt",
          type: "farm" as const,
          bbox: [74.0, 30.5, 75.5, 31.5],
          description: "Intensive agriculture region in India's Punjab state, known for wheat and rice."
        },
        {
          id: "mine-escondida",
          name: "Escondida Copper Mine (Chile)",
          type: "mine" as const,
          bbox: [-69.25, -24.5, -68.95, -24.2],
          description: "World's largest copper mine located in the Atacama Desert."
        },
        {
          id: "mine-pilbara-iron",
          name: "Pilbara Iron Ore (Tom Price area)",
          type: "mine" as const,
          bbox: [117.6, -22.8, 118.2, -22.2],
          description: "Iron ore mining region in Western Australia near Tom Price."
        },
        {
          id: "mine-grasberg",
          name: "Grasberg Mine (Papua, Indonesia)",
          type: "mine" as const,
          bbox: [137.02, -4.1, 137.2, -3.9],
          description: "Large copper and gold mine located in the Sudirman Range."
        },
        {
          id: "energy-ghawar",
          name: "Ghawar Oil Field (Saudi Arabia)",
          type: "energy" as const,
          bbox: [48.8, 25.0, 50.2, 26.8],
          description: "One of the world's largest conventional oil fields in Eastern Province."
        },
        {
          id: "energy-permian-midland",
          name: "Permian Basin (Midland area)",
          type: "energy" as const,
          bbox: [-103.0, 31.4, -101.5, 32.7],
          description: "Shale oil and gas production hub in West Texas."
        },
        {
          id: "energy-three-gorges",
          name: "Three Gorges Dam (Hubei, China)",
          type: "energy" as const,
          bbox: [111.0, 30.8, 111.2, 31.1],
          description: "Massive hydroelectric dam on the Yangtze River."
        },
        {
          id: "farm-mato-grosso-south",
          name: "Mato Grosso do Sul Soybean Region",
          type: "farm" as const,
          bbox: [-55.0, -22.0, -53.0, -20.0],
          description: "Brazil's second largest soybean producing state, critical for global soy supply."
        },
        {
          id: "port-houston",
          name: "Port of Houston",
          type: "port" as const,
          bbox: [-95.32, 29.70, -95.20, 29.78],
          description: "Largest U.S. port for foreign waterborne tonnage, critical for energy exports."
        },
        {
          id: "mine-codelco-norte",
          name: "Codelco Norte Mining Complex",
          type: "mine" as const,
          bbox: [-69.10, -22.35, -68.85, -22.20],
          description: "Chile's largest copper mining complex including Chuquicamata, critical for global copper supply."
        },
        {
          id: "energy-north-sea-platforms",
          name: "North Sea Oil Platforms (Brent Field)",
          type: "energy" as const,
          bbox: [1.5, 61.0, 2.5, 61.5],
          description: "Major North Sea oil production region, benchmark for Brent crude pricing."
        }
      ],
      instrumentMap: {
        port: {
          futures: [
            { symbol: "CL", name: "Crude Oil Futures" },
            { symbol: "BZ", name: "Brent Crude Oil Futures" }
          ],
          etfs: [
            { symbol: "USO", name: "United States Oil Fund" },
            { symbol: "XLE", name: "Energy Select Sector SPDR" }
          ],
          fx: [
            { pair: "USD/CNY", name: "US Dollar / Chinese Yuan" }
          ]
        },
        farm: {
          futures: [
            { symbol: "ZC", name: "Corn Futures" },
            { symbol: "ZW", name: "Wheat Futures" },
            { symbol: "ZS", name: "Soybean Futures" }
          ],
          etfs: [
            { symbol: "DBA", name: "Invesco DB Agriculture Fund" },
            { symbol: "MOO", name: "VanEck Agribusiness ETF" }
          ],
          fx: [
            { pair: "USD/BRL", name: "US Dollar / Brazilian Real" }
          ]
        },
        mine: {
          futures: [
            { symbol: "HG", name: "Copper Futures" },
            { symbol: "GC", name: "Gold Futures" },
            { symbol: "SI", name: "Silver Futures" }
          ],
          etfs: [
            { symbol: "COPX", name: "Global X Copper Miners ETF" },
            { symbol: "GDX", name: "VanEck Gold Miners ETF" }
          ],
          fx: [
            { pair: "USD/CLP", name: "US Dollar / Chilean Peso" },
            { pair: "USD/AUD", name: "US Dollar / Australian Dollar" }
          ]
        },
        energy: {
          futures: [
            { symbol: "NG", name: "Natural Gas Futures" },
            { symbol: "RB", name: "RBOB Gasoline Futures" }
          ],
          etfs: [
            { symbol: "XLE", name: "Energy Select Sector SPDR" },
            { symbol: "ICLN", name: "iShares Global Clean Energy ETF" }
          ],
          fx: [
            { pair: "USD/CAD", name: "US Dollar / Canadian Dollar" },
            { pair: "USD/RUB", name: "US Dollar / Russian Ruble" }
          ]
        }
      }
    };

    let aoiCount = 0;
    let instrumentCount = 0;

    // Upsert AOIs
    for (const aoi of seedData.aois) {
      const existing = await ctx.db
        .query("aoi_catalog")
        .withIndex("by_slug", q => q.eq("slug", aoi.id))
        .unique();
      
      if (!existing) {
        await ctx.db.insert("aoi_catalog", {
          slug: aoi.id,
          name: aoi.name,
          type: aoi.type,
          bbox: aoi.bbox,
          description: aoi.description,
        });
        aoiCount++;
      } else {
        await ctx.db.patch(existing._id, {
          name: aoi.name,
          type: aoi.type,
          bbox: aoi.bbox,
          description: aoi.description,
        });
      }
    }

    // Upsert instrument maps
    for (const [type, instruments] of Object.entries(seedData.instrumentMap)) {
      const typeKey = type as "port" | "farm" | "mine" | "energy";
      const existing = await ctx.db
        .query("instrument_map")
        .withIndex("by_type", q => q.eq("type", typeKey))
        .unique();
      
      if (!existing) {
        await ctx.db.insert("instrument_map", {
          type: typeKey,
          futures: instruments.futures ?? [],
          etfs: instruments.etfs ?? [],
          fx: instruments.fx ?? [],
        });
        instrumentCount++;
      } else {
        await ctx.db.patch(existing._id, {
          futures: instruments.futures ?? [],
          etfs: instruments.etfs ?? [],
          fx: instruments.fx ?? [],
        });
      }
    }

    return {
      success: true,
      message: `Imported ${aoiCount} new AOIs and ${instrumentCount} instrument maps`,
      totalAois: seedData.aois.length,
      totalInstrumentTypes: Object.keys(seedData.instrumentMap).length
    };
  },
});
