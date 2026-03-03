import type { Config, CommuteConfig } from "./config.js";
import type { ListingResult } from "./zillow/types.js";
import type { SearchParams } from "./zillow/types.js";
import { getRapidApiKey, searchListings } from "./zillow/api.js";
import { formatListings } from "./format.js";
import logger from "./logger.js";

/** Haversine distance in miles between two lat/lng points. */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function withinCommute(
  listing: ListingResult,
  commute: CommuteConfig,
): boolean {
  if (listing.latitude == null || listing.longitude == null) return false;
  return commute.addresses.every(
    (addr) =>
      haversineDistance(
        listing.latitude!,
        listing.longitude!,
        addr.lat,
        addr.lng,
      ) <= commute.max_miles,
  );
}

export async function run(config: Config): Promise<void> {
  const apiKey = getRapidApiKey();
  const allResults: ListingResult[] = [];

  for (const location of config.locations) {
    const params: SearchParams = {
      location,
      home_status: config.search.home_status,
      listing_type: config.search.listing_type,
      sort: config.search.sort,
    };

    const results = await searchListings(params, apiKey);
    allResults.push(...results);
  }

  // Deduplicate by zpid
  const seen = new Set<string>();
  const unique = allResults.filter((r) => {
    if (seen.has(r.zpid)) return false;
    seen.add(r.zpid);
    return true;
  });

  const dupes = allResults.length - unique.length;
  logger.info(
    { total: unique.length, duplicatesRemoved: dupes },
    "%d listings total%s",
    unique.length,
    dupes > 0 ? ` (${dupes} duplicates removed)` : "",
  );

  // Apply filters
  const { filters, commute } = config;
  let filtered = unique;

  if (filters.min_beds != null) {
    filtered = filtered.filter((r) => (r.bedrooms ?? 0) >= filters.min_beds!);
  }
  if (filters.min_baths != null) {
    filtered = filtered.filter((r) => (r.bathrooms ?? 0) >= filters.min_baths!);
  }
  if (filters.max_price != null) {
    filtered = filtered.filter(
      (r) => (r.price ?? Infinity) <= filters.max_price!,
    );
  }
  if (filters.home_types && filters.home_types.length > 0) {
    const types = new Set(filters.home_types);
    filtered = filtered.filter(
      (r) => r.homeType != null && types.has(r.homeType),
    );
  }
  if (commute) {
    filtered = filtered.filter((r) => withinCommute(r, commute));
  }

  const removed = unique.length - filtered.length;
  if (removed > 0) {
    logger.info(
      { kept: filtered.length, filtered: removed },
      "%d listings after filters (%d removed)",
      filtered.length,
      removed,
    );
  }

  formatListings(filtered, config.output.format, config.output.file);
}
