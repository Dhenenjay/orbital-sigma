export type AoiType = "port" | "farm" | "mine" | "energy";

export interface Aoi {
  id: string;
  name: string;
  type: AoiType;
  bbox: [number, number, number, number];
  description?: string;
}

// Load AOIs statically; Next.js will bundle this for client use as well
import aoisData from "../../../data/aois.json" assert { type: "json" };

export function getAllAois(): Aoi[] {
  return aoisData as unknown as Aoi[];
}

export function searchAois(keyword: string, type?: AoiType): Aoi[] {
  const all = getAllAois();
  const term = (keyword ?? "").trim().toLowerCase();
  const filteredByType = type ? all.filter(a => a.type === type) : all;
  if (!term) return filteredByType;
  return filteredByType.filter(a =>
    a.name.toLowerCase().includes(term) ||
    a.id.toLowerCase().includes(term) ||
    (a.description?.toLowerCase().includes(term) ?? false)
  );
}

export function filterAoisByType(type: AoiType): Aoi[] {
  return getAllAois().filter(a => a.type === type);
}

