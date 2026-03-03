import { readFileSync } from "node:fs";
import yaml from "js-yaml";

export interface SearchArea {
  name: string;
  params: Record<string, string | number>;
}

export interface Config {
  search_areas: SearchArea[];
  property_types: string[];
  price: { min?: number | null; max?: number | null };
  filters: Record<string, number | null>;
  page_size: number;
  output: { format: string; file: string | null };
}

interface RawConfig {
  search_areas?: {
    zips?: Record<string, (string | number)[]>;
    geo?: Array<{
      name: string;
      latitude: number;
      longitude: number;
      radius?: number;
    }>;
    addresses?: Array<{ name?: string; address1: string; address2: string }>;
    fips?: Array<{ name?: string; fips: string }>;
  };
  property_types?: string[];
  price?: { min?: number | null; max?: number | null };
  filters?: Record<string, number | null>;
  page_size?: number;
  output?: { format?: string; file?: string | null };
}

function expandSearchAreas(raw: RawConfig["search_areas"]): SearchArea[] {
  if (!raw) return [];
  const areas: SearchArea[] = [];

  for (const [city, codes] of Object.entries(raw.zips ?? {})) {
    for (const code of codes) {
      areas.push({
        name: `${city} ${code}`,
        params: { postalCode: String(code) },
      });
    }
  }

  for (const g of raw.geo ?? []) {
    areas.push({
      name: g.name,
      params: {
        latitude: g.latitude,
        longitude: g.longitude,
        radius: g.radius ?? 5,
      },
    });
  }

  for (const a of raw.addresses ?? []) {
    areas.push({
      name: a.name ?? `${a.address1}, ${a.address2}`,
      params: { address1: a.address1, address2: a.address2 },
    });
  }

  for (const f of raw.fips ?? []) {
    areas.push({
      name: f.name ?? `FIPS ${f.fips}`,
      params: { fips: f.fips },
    });
  }

  return areas;
}

export function loadConfig(path: string = "config.yaml"): Config {
  const raw = yaml.load(readFileSync(path, "utf-8")) as RawConfig;
  return {
    search_areas: expandSearchAreas(raw.search_areas),
    property_types: raw.property_types ?? [],
    price: raw.price ?? {},
    filters: raw.filters ?? {},
    page_size: Math.min(raw.page_size ?? 100, 100),
    output: {
      format: raw.output?.format ?? "json",
      file: raw.output?.file ?? null,
    },
  };
}
