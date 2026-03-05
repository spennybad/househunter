import type { Config, CommuteConfig } from "./config.js";
import type { ListingResult } from "./zillow/types.js";
import type {
  SearchParams,
  SearchByCoordinatesParams,
} from "./zillow/types.js";
import {
  getRapidApiKey,
  searchListings,
  searchByCoordinates,
} from "./zillow/api.js";
import { formatListings } from "./format.js";
import { getPool, initSchema, close } from "./db/index.js";
import {
  upsertListing,
  insertSnapshot,
  markInactive,
  getStats,
  getSnapshotCount,
} from "./db/generated/query_sql.js";
import { fromZillow } from "./db/convert.js";
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

  if (config.commute?.addresses?.length) {
    // Single coordinate-based search using the first commute address
    const center = config.commute.addresses[0];
    const radius = config.search.radius ?? config.commute.max_miles;
    logger.info(
      { lat: center.lat, lng: center.lng, radius },
      "Coordinate search: %s (radius %d mi)",
      center.label,
      radius,
    );

    let page = 1;
    while (true) {
      const params: SearchByCoordinatesParams = {
        latitude: center.lat,
        longitude: center.lng,
        radius,
        home_status: config.search.home_status,
        listing_type: config.search.listing_type,
        sort: config.search.sort,
        page,
      };

      const results = await searchByCoordinates(params, apiKey);
      if (results.length === 0) break;
      allResults.push(...results);
      page++;
    }
  } else {
    // Fallback: per-location search
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
  // City whitelist: only keep listings in configured locations
  if (config.locations.length > 0) {
    const citySet = new Set(
      config.locations.map((l) => {
        // Extract city name from "City, ST" format
        const comma = l.indexOf(",");
        return (comma >= 0 ? l.slice(0, comma) : l).trim().toLowerCase();
      }),
    );
    filtered = filtered.filter(
      (r) => r.city && citySet.has(r.city.toLowerCase()),
    );
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

  // Persist to database
  const pool = await getPool(config.db.url);
  try {
    await initSchema(pool);

    const converted = filtered.map(fromZillow);
    for (const listing of converted) {
      const row = await upsertListing(pool, listing);
      if (row) {
        await insertSnapshot(pool, {
          listingId: row.id,
          price: listing.price,
          homeStatus: listing.homeStatus,
          sourceData: listing.sourceData,
        });
      }
    }

    const activeSourceIds = converted.map((l) => l.sourceId);
    await markInactive(pool, {
      source: "zillow",
      activeSourceIds,
    });

    const stats = await getStats(pool);
    const snapCount = await getSnapshotCount(pool);
    logger.info({ stats, snapshots: snapCount?.count ?? 0 }, "DB stats");
  } finally {
    await close(pool);
  }

  formatListings(filtered, config.output.format, config.output.file);
}
