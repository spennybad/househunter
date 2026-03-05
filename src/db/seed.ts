import { readFileSync } from "node:fs";
import { getPool, initSchema, close } from "./index.js";
import { upsertListing, insertSnapshot } from "./generated/query_sql.js";
import type { UpsertListingArgs } from "./generated/query_sql.js";
import { loadConfig } from "../config.js";
import logger from "../logger.js";

function parseCsv(path: string): UpsertListingArgs[] {
  const text = readFileSync(path, "utf-8").trim();
  const [headerLine, ...rows] = text.split("\n");
  const headers = headerLine.split(",");

  return rows.filter(Boolean).map((line) => {
    // Handle quoted fields (commas inside quotes)
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current);

    const get = (name: string): string | null => {
      const idx = headers.indexOf(name);
      if (idx === -1) return null;
      const v = values[idx];
      return v === "" ? null : v;
    };
    const getNum = (name: string): number | null => {
      const v = get(name);
      return v != null ? Number(v) : null;
    };

    return {
      source: "zillow",
      sourceId: get("zpid")!,
      address: get("address")!,
      city: get("city"),
      state: get("state"),
      zipcode: get("zipcode"),
      price: getNum("price"),
      bedrooms: getNum("bedrooms"),
      bathrooms: getNum("bathrooms"),
      livingArea: getNum("livingArea"),
      lotAreaValue: null,
      yearBuilt: null,
      homeType: get("homeType"),
      homeStatus: get("homeStatus"),
      latitude: null,
      longitude: null,
      imgSrc: null,
      detailUrl: get("detailUrl"),
      sourceData: {
        zestimate: getNum("zestimate"),
        daysOnZillow: getNum("daysOnZillow"),
      },
    };
  });
}

async function main() {
  const csvPath = process.argv[2] ?? "results.csv";
  const config = loadConfig();
  const pool = await getPool(config.db.url);

  try {
    await initSchema(pool);
    const listings = parseCsv(csvPath);
    logger.info("Seeding %d listings from %s", listings.length, csvPath);

    for (const listing of listings) {
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

    logger.info("Seeded %d listings", listings.length);
  } finally {
    await close(pool);
  }
}

main();
