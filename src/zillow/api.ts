import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
import logger from "../logger.js";
import type {
  ApiResponse,
  SearchParams,
  SearchByCoordinatesParams,
  ListingResult,
  PropertyDetail,
  PriceEvent,
  TaxRecord,
  Zestimate,
} from "./types.js";

const BASE_URL = "https://real-time-real-estate-data.p.rapidapi.com";
const API_HOST = "real-time-real-estate-data.p.rapidapi.com";

export function getRapidApiKey(): string {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) {
    logger.error(
      "RAPIDAPI_KEY not set. Set it in .env.local or as an environment variable.",
    );
    process.exit(1);
  }
  return key;
}

async function apiFetch<T>(
  path: string,
  params: Record<string, string | number>,
  apiKey: string,
): Promise<T> {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => [k, String(v)]),
  ).toString();
  const url = `${BASE_URL}${path}?${qs}`;

  const resp = await fetch(url, {
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": API_HOST,
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Zillow API Error: ${resp.status} - ${body.slice(0, 200)}`);
  }

  const json = (await resp.json()) as ApiResponse<T>;
  if (json.status === "ERROR") {
    throw new Error(
      `Zillow API Error: ${json.error?.code} - ${json.error?.message}`,
    );
  }

  return json.data as T;
}

// --- Normalizers ---

function normalizeListingResult(raw: Record<string, unknown>): ListingResult {
  return {
    zpid: String(raw.zpid ?? ""),
    address: String(raw.streetAddress ?? raw.address ?? ""),
    city: String(raw.city ?? ""),
    state: String(raw.state ?? ""),
    zipcode: String(raw.zipcode ?? ""),
    price: asNumber(raw.price ?? raw.unformattedPrice),
    bedrooms: asNumber(raw.bedrooms),
    bathrooms: asNumber(raw.bathrooms),
    livingArea: asNumber(raw.livingArea),
    lotAreaValue: asNumber(raw.lotAreaValue),
    yearBuilt: asNumber(raw.yearBuilt),
    homeType: asString(raw.homeType),
    homeStatus: asString(raw.homeStatus),
    zestimate: asNumber(raw.zestimate),
    rentZestimate: asNumber(raw.rentZestimate),
    daysOnZillow: asNumber(raw.daysOnZillow),
    imgSrc: asString(raw.imgSrc),
    detailUrl: asString(raw.detailUrl),
    latitude: asNumber(raw.latitude),
    longitude: asNumber(raw.longitude),
  };
}

function normalizePropertyDetail(raw: Record<string, unknown>): PropertyDetail {
  const base = normalizeListingResult(raw);
  const priceHistory = Array.isArray(raw.priceHistory)
    ? raw.priceHistory.map(
        (e: Record<string, unknown>): PriceEvent => ({
          date: String(e.date ?? ""),
          price: asNumber(e.price),
          event: String(e.event ?? ""),
        }),
      )
    : [];
  const taxHistory = Array.isArray(raw.taxHistory)
    ? raw.taxHistory.map(
        (e: Record<string, unknown>): TaxRecord => ({
          year: Number(e.year ?? 0),
          taxPaid: asNumber(e.taxPaid),
          value: asNumber(e.value),
        }),
      )
    : [];
  const photos = Array.isArray(raw.responsivePhotos)
    ? raw.responsivePhotos.map((p: Record<string, unknown>) =>
        String(
          (p.mixedSources as Record<string, unknown[]>)?.jpeg?.[0] ??
            p.url ??
            "",
        ),
      )
    : [];

  return {
    ...base,
    description: asString(raw.description),
    priceHistory,
    taxHistory,
    photos,
    mlsId: asString(raw.mlsid),
    brokerageName: asString(raw.brokerageName),
    agentName: asString(raw.agentName),
    datePosted: asString(raw.datePosted),
    dateSold: asString(raw.dateSold),
    features: (raw.resoFacts as Record<string, unknown>) ?? {},
  };
}

/** Handle both array (`results`) and numeric-keyed object response formats. */
function extractResults(
  data: Record<string, unknown>,
): Record<string, unknown>[] {
  if (Array.isArray(data.results)) return data.results;
  // API sometimes returns { "0": {...}, "1": {...}, ... }
  const numericValues = Object.entries(data)
    .filter(([k]) => /^\d+$/.test(k))
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, v]) => v as Record<string, unknown>);
  if (numericValues.length > 0) return numericValues;
  return [];
}

// --- Public API ---

export async function searchListings(
  params: SearchParams,
  apiKey: string,
): Promise<ListingResult[]> {
  const queryParams: Record<string, string | number> = {
    location: params.location,
  };
  if (params.home_status) queryParams.home_status = params.home_status;
  if (params.listing_type) queryParams.listing_type = params.listing_type;
  if (params.sort) queryParams.sort = params.sort;
  if (params.page) queryParams.page = params.page;

  logger.info("Zillow search: %s", params.location);

  const data = await apiFetch<Record<string, unknown>>(
    "/search",
    queryParams,
    apiKey,
  );

  const results = extractResults(data);
  logger.info("Found %d listings", results.length);

  return results.map((r: Record<string, unknown>) => normalizeListingResult(r));
}

export async function searchByCoordinates(
  params: SearchByCoordinatesParams,
  apiKey: string,
): Promise<ListingResult[]> {
  const queryParams: Record<string, string | number> = {
    latitude: params.latitude,
    longitude: params.longitude,
  };
  if (params.radius) queryParams.radius = params.radius;
  if (params.home_status) queryParams.home_status = params.home_status;
  if (params.listing_type) queryParams.listing_type = params.listing_type;
  if (params.sort) queryParams.sort = params.sort;
  if (params.page) queryParams.page = params.page;

  logger.info("Zillow search: %s,%s", params.latitude, params.longitude);

  const data = await apiFetch<Record<string, unknown>>(
    "/search-coordinates",
    queryParams,
    apiKey,
  );

  const results = extractResults(data);
  logger.info("Found %d listings", results.length);

  return results.map((r: Record<string, unknown>) => normalizeListingResult(r));
}

export async function getPropertyDetail(
  zpid: string,
  apiKey: string,
): Promise<PropertyDetail> {
  logger.info("Zillow property detail: zpid %s", zpid);

  const data = await apiFetch<Record<string, unknown>>(
    "/property-details",
    { zpid },
    apiKey,
  );

  return normalizePropertyDetail(data);
}

export async function getPropertyByAddress(
  address: string,
  apiKey: string,
): Promise<PropertyDetail> {
  logger.info("Zillow property by address: %s", address);

  const data = await apiFetch<Record<string, unknown>>(
    "/property-details-address",
    { address },
    apiKey,
  );

  return normalizePropertyDetail(data);
}

export async function getZestimate(
  zpid: string,
  apiKey: string,
): Promise<Zestimate> {
  logger.info("Zillow zestimate: zpid %s", zpid);

  const data = await apiFetch<Record<string, unknown>>(
    "/zestimate",
    { zpid },
    apiKey,
  );

  return {
    zpid: String(data.zpid ?? zpid),
    zestimate: asNumber(data.zestimate),
    rentZestimate: asNumber(data.rentZestimate),
  };
}

// --- Helpers ---

function asNumber(val: unknown): number | null {
  if (val == null) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function asString(val: unknown): string | null {
  if (val == null || val === "") return null;
  return String(val);
}
