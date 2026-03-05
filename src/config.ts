import { readFileSync } from "node:fs";
import yaml from "js-yaml";

export interface SearchConfig {
  home_status?: "FOR_SALE" | "FOR_RENT" | "RECENTLY_SOLD";
  listing_type?: "BY_AGENT" | "BY_OWNER" | "NEW_CONSTRUCTION";
  sort?: "DEFAULT" | "NEWEST" | "PRICE_LOW" | "PRICE_HIGH";
  radius?: number;
}

export interface FiltersConfig {
  min_beds?: number;
  min_baths?: number;
  max_price?: number;
  home_types?: string[];
}

export interface CommuteAddress {
  label: string;
  address: string;
  lat: number;
  lng: number;
}

export interface CommuteConfig {
  max_minutes: number;
  max_miles: number;
  addresses: CommuteAddress[];
}

export interface OutputConfig {
  format: "json" | "csv" | "table";
  file: string | null;
}

export interface DbConfig {
  url: string;
}

export interface Config {
  locations: string[];
  search: SearchConfig;
  filters: FiltersConfig;
  commute: CommuteConfig | null;
  output: OutputConfig;
  db: DbConfig;
}

interface RawConfig {
  locations?: string[];
  search?: {
    home_status?: string;
    listing_type?: string;
    sort?: string;
    radius?: number;
  };
  filters?: {
    min_beds?: number;
    min_baths?: number;
    max_price?: number;
    home_types?: string[];
  };
  commute?: {
    max_minutes?: number;
    max_miles?: number;
    addresses?: {
      label?: string;
      address?: string;
      lat?: number;
      lng?: number;
    }[];
  };
  output?: {
    format?: string;
    file?: string | null;
  };
  db?: {
    url?: string;
  };
}

export function loadConfig(path: string = "config.yaml"): Config {
  const raw = yaml.load(readFileSync(path, "utf-8")) as RawConfig;

  if (!raw.locations || raw.locations.length === 0) {
    throw new Error(
      `Config error: "locations" must be a non-empty list in ${path}`,
    );
  }

  let commute: CommuteConfig | null = null;
  if (raw.commute?.addresses && raw.commute.addresses.length > 0) {
    commute = {
      max_minutes: raw.commute.max_minutes ?? 45,
      max_miles: raw.commute.max_miles ?? 25,
      addresses: raw.commute.addresses
        .filter((a) => a.lat != null && a.lng != null)
        .map((a) => ({
          label: a.label ?? a.address ?? "Unknown",
          address: a.address ?? "",
          lat: a.lat!,
          lng: a.lng!,
        })),
    };
  }

  return {
    locations: raw.locations,
    search: {
      home_status:
        (raw.search?.home_status as SearchConfig["home_status"]) ?? "FOR_SALE",
      listing_type: raw.search?.listing_type as SearchConfig["listing_type"],
      sort: (raw.search?.sort as SearchConfig["sort"]) ?? "DEFAULT",
      radius: raw.search?.radius,
    },
    filters: {
      min_beds: raw.filters?.min_beds,
      min_baths: raw.filters?.min_baths,
      max_price: raw.filters?.max_price,
      home_types: raw.filters?.home_types,
    },
    commute,
    output: {
      format: (raw.output?.format as OutputConfig["format"]) ?? "table",
      file: raw.output?.file ?? null,
    },
    db: {
      url:
        raw.db?.url ??
        "postgresql://househunter:househunter@localhost:5432/househunter",
    },
  };
}
