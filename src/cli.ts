#!/usr/bin/env node
import { config } from "dotenv";
config({ path: ".env.local" });
import { Command } from "commander";
import logger from "./logger.js";
import { loadConfig as loadAttomConfig } from "./attom/config.js";
import {
  BASE_URL,
  ENDPOINTS,
  getApiKey,
  searchProperties,
  lookupProperty,
} from "./attom/api.js";
import { formatOutput } from "./attom/format.js";
import {
  getRapidApiKey,
  searchListings,
  searchByCoordinates,
  getPropertyDetail,
  getPropertyByAddress,
  getZestimate,
} from "./zillow/api.js";
import type {
  SearchParams,
  SearchByCoordinatesParams,
} from "./zillow/types.js";
import { loadConfig } from "./config.js";
import { run } from "./run.js";
import { formatListings } from "./format.js";

function validateEndpoint(name: string): void {
  if (!(name in ENDPOINTS)) {
    logger.error(`Unknown endpoint "${name}". Use "endpoints" to list.`);
    process.exit(1);
  }
}

const program = new Command();
program.name("househunter").description("Automated house hunting tool");

// --- Top-level run command ---

program
  .command("run")
  .description("Search all locations from config and output results")
  .option("-c, --config <path>", "Config file path", "config.yaml")
  .option("-f, --format <fmt>", "Output format (json|csv|table)")
  .option("-o, --output <path>", "Output file path")
  .action(async (opts) => {
    const config = loadConfig(opts.config);
    if (opts.format) config.output.format = opts.format;
    if (opts.output) config.output.file = opts.output;
    await run(config);
  });

// --- ATTOM commands ---

const attom = program
  .command("attom")
  .description("ATTOM property data commands");

attom
  .command("search")
  .description("Search properties using config.yaml filters")
  .option("-c, --config <path>", "Config file path", "config.yaml")
  .option("-e, --endpoint <name>", "API endpoint to use", "snapshot")
  .option("-f, --format <fmt>", "Output format (json|csv|table)")
  .option("-o, --output <path>", "Output file path")
  .action(async (opts) => {
    validateEndpoint(opts.endpoint);
    const apiKey = getApiKey();
    const config = loadAttomConfig(opts.config);
    const results = await searchProperties(config, apiKey, opts.endpoint);
    const fmt = opts.format ?? config.output.format;
    const outFile = opts.output ?? config.output.file;
    formatOutput(results, fmt, outFile);
  });

attom
  .command("lookup")
  .description("Look up a single property by address")
  .argument("<address1>", 'Street address, e.g. "4529 Winona Court"')
  .argument("<address2>", 'City/State, e.g. "Denver, CO"')
  .option("-e, --endpoint <name>", "API endpoint to use", "detail")
  .action(async (address1: string, address2: string, opts) => {
    validateEndpoint(opts.endpoint);
    const apiKey = getApiKey();
    const result = await lookupProperty(
      address1,
      address2,
      apiKey,
      opts.endpoint,
    );
    console.log(JSON.stringify(result, null, 2));
  });

attom
  .command("endpoints")
  .description("List available ATTOM API endpoints")
  .action(() => {
    console.log("Available ATTOM API endpoints:\n");
    for (const [name, path] of Object.entries(ENDPOINTS)) {
      console.log(`  ${name.padEnd(20)} \u2192 ${BASE_URL}${path}`);
    }
  });

// --- Zillow commands ---

const zillow = program.command("zillow").description("Zillow listing commands");

zillow
  .command("search")
  .description("Search listings by location (city, zip, neighborhood)")
  .argument("<location>", 'Location, e.g. "Los Angeles, CA" or "94301"')
  .option(
    "-s, --status <type>",
    "Listing status (FOR_SALE|FOR_RENT|RECENTLY_SOLD)",
    "FOR_SALE",
  )
  .option(
    "-l, --listing-type <type>",
    "Listing type (BY_AGENT|BY_OWNER|NEW_CONSTRUCTION)",
  )
  .option(
    "--sort <type>",
    "Sort order (DEFAULT|NEWEST|PRICE_LOW|PRICE_HIGH)",
    "DEFAULT",
  )
  .option("-p, --page <n>", "Page number", parseInt)
  .option("-f, --format <fmt>", "Output format (json|csv|table)", "table")
  .action(async (location: string, opts) => {
    const apiKey = getRapidApiKey();
    const params: SearchParams = {
      location,
      home_status: opts.status,
      listing_type: opts.listingType,
      sort: opts.sort,
      page: opts.page,
    };
    const results = await searchListings(params, apiKey);
    formatListings(results, opts.format);
  });

zillow
  .command("search-coords")
  .description("Search listings by latitude/longitude")
  .argument("<lat>", "Latitude")
  .argument("<lng>", "Longitude")
  .option("-r, --radius <n>", "Search radius in miles", parseInt)
  .option(
    "-s, --status <type>",
    "Listing status (FOR_SALE|FOR_RENT|RECENTLY_SOLD)",
    "FOR_SALE",
  )
  .option(
    "--sort <type>",
    "Sort order (DEFAULT|NEWEST|PRICE_LOW|PRICE_HIGH)",
    "DEFAULT",
  )
  .option("-p, --page <n>", "Page number", parseInt)
  .option("-f, --format <fmt>", "Output format (json|csv|table)", "table")
  .action(async (lat: string, lng: string, opts) => {
    const apiKey = getRapidApiKey();
    const params: SearchByCoordinatesParams = {
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
      radius: opts.radius,
      home_status: opts.status,
      sort: opts.sort,
      page: opts.page,
    };
    const results = await searchByCoordinates(params, apiKey);
    formatListings(results, opts.format);
  });

zillow
  .command("detail")
  .description("Get full property details by Zillow Property ID")
  .argument("<zpid>", "Zillow Property ID")
  .action(async (zpid: string) => {
    const apiKey = getRapidApiKey();
    const detail = await getPropertyDetail(zpid, apiKey);
    console.log(JSON.stringify(detail, null, 2));
  });

zillow
  .command("address")
  .description("Get property details by street address")
  .argument("<address>", 'Full address, e.g. "123 Main St, City, ST 12345"')
  .action(async (address: string) => {
    const apiKey = getRapidApiKey();
    const detail = await getPropertyByAddress(address, apiKey);
    console.log(JSON.stringify(detail, null, 2));
  });

zillow
  .command("zestimate")
  .description("Get Zestimate (price estimate) for a property")
  .argument("<zpid>", "Zillow Property ID")
  .action(async (zpid: string) => {
    const apiKey = getRapidApiKey();
    const result = await getZestimate(zpid, apiKey);
    console.log(JSON.stringify(result, null, 2));
  });

program.parse();
