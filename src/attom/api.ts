import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import type { Config, SearchArea } from "./config.js";

export const BASE_URL = "https://api.gateway.attomdata.com/propertyapi/v1.0.0";

export const ENDPOINTS: Record<string, string> = {
  snapshot: "/property/snapshot",
  detail: "/property/detail",
  basicprofile: "/property/basicprofile",
  expandedprofile: "/property/expandedprofile",
  sale: "/sale/snapshot",
  avm: "/avm/snapshot",
  assessment: "/assessment/snapshot",
};

const FILTER_PARAMS: Record<string, string> = {
  min_beds: "minBeds",
  max_beds: "maxBeds",
  min_baths: "minBathsTotal",
  max_baths: "maxBathsTotal",
  min_sqft: "minUniversalSize",
  max_sqft: "maxUniversalSize",
  year_built_min: "minYearBuilt",
  year_built_max: "maxYearBuilt",
};

export function getApiKey(): string {
  let key = process.env.ATTOM_API_KEY;
  if (!key && existsSync(".env")) {
    const match = readFileSync(".env", "utf-8").match(
      /^ATTOM_API_KEY=["']?(.+?)["']?\s*$/m,
    );
    key = match?.[1];
  }
  if (!key) {
    process.stderr.write(
      "Error: ATTOM_API_KEY not set. Set it via environment variable or .env file.\n",
    );
    process.exit(1);
  }
  return key;
}

function toQueryString(params: Record<string, string | number>): string {
  return new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
}

function buildSearchParams(
  area: SearchArea,
  config: Config,
): Record<string, string | number> {
  const params: Record<string, string | number> = { ...area.params };

  if (config.property_types.length > 0) {
    params.propertyType = config.property_types.join("|");
  }
  if (config.price.min) params.minAVMValue = config.price.min;
  if (config.price.max) params.maxAVMValue = config.price.max;

  for (const [configKey, apiKey] of Object.entries(FILTER_PARAMS)) {
    const val = config.filters[configKey];
    if (val) params[apiKey] = val;
  }

  params.pageSize = config.page_size;
  return params;
}

function extractProperties(
  data: Record<string, unknown>,
): Record<string, unknown>[] {
  const candidates = [
    data.property,
    (data.sale as Record<string, unknown> | undefined)?.property,
    (data.avm as Record<string, unknown> | undefined)?.property,
  ];
  return (candidates.find(Array.isArray) ?? []) as Record<string, unknown>[];
}

async function apiFetch(url: string, apiKey: string): Promise<Response> {
  return fetch(url, {
    headers: { Accept: "application/json", apikey: apiKey },
    signal: AbortSignal.timeout(30_000),
  });
}

export async function searchProperties(
  config: Config,
  apiKey: string,
  endpoint: string,
): Promise<Record<string, unknown>[]> {
  const allResults: Record<string, unknown>[] = [];

  for (const area of config.search_areas) {
    const params = buildSearchParams(area, config);
    const qs = toQueryString(params);
    const url = `${BASE_URL}${ENDPOINTS[endpoint]}`;

    process.stderr.write(
      `\u{1F50D} Searching: ${area.name} (${endpoint})...\n`,
    );
    process.stderr.write(`   URL: ${url}?${qs}\n`);

    try {
      const resp = await apiFetch(`${url}?${qs}`, apiKey);
      if (!resp.ok) {
        const body = await resp.text();
        process.stderr.write(
          `   API Error: ${resp.status} - ${body.slice(0, 200)}\n`,
        );
        continue;
      }

      const data = (await resp.json()) as Record<string, unknown>;
      const properties = extractProperties(data);

      process.stderr.write(`   Found ${properties.length} properties\n`);
      for (const p of properties) p._search_area = area.name;
      allResults.push(...properties);
    } catch (e) {
      process.stderr.write(`   Error: ${e}\n`);
    }
  }

  return allResults;
}

export async function lookupProperty(
  address1: string,
  address2: string,
  apiKey: string,
  endpoint: string,
): Promise<unknown> {
  const qs = toQueryString({ address1, address2 });
  const url = `${BASE_URL}${ENDPOINTS[endpoint]}`;

  process.stderr.write(`\u{1F50D} Looking up: ${address1}, ${address2}...\n`);
  const resp = await apiFetch(`${url}?${qs}`, apiKey);
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`API Error: ${resp.status} - ${body.slice(0, 200)}`);
  }
  return resp.json();
}
