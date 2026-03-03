# Househunter

Agent-driven tool for finding, enriching, and tracking residential property listings over time.

## Big Picture

This tool is designed to be used by agents to find houses for sale that meet very specific criteria. It works in layers:

1. **Listing discovery** — Aggregate active for-sale listings from consumer sources (Zillow, Redfin, etc.) via APIs and/or web scraping
2. **Property enrichment** — Use ATTOM to get in-depth data on specific properties (valuations, sale history, tax assessments, building details) that complement the listing data
3. **Tracking** — Build and maintain a collection of properties over time, tracking changes in price, status, and availability

## API Docs

- ATTOM Property API: https://api.developer.attomdata.com/docs
- Zillow (via RapidAPI "Real-Time Zillow Data"): https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-zillow-data

## Tech Stack

- TypeScript (strict mode, ES2022 target, Node16 modules)
- pnpm for package management
- Commander for CLI parsing
- js-yaml for config parsing
- dotenv for env loading (`.env.local`)
- pino + pino-pretty for structured logging (leveled, stderr output)
- tsx for running TypeScript directly
- ESLint + Prettier with husky pre-commit hook

## Project Structure

```
src/
├── cli.ts              # CLI entry point — subcommands: run, attom, zillow
├── config.ts           # Unified config loader (locations, search, filters, commute, output)
├── run.ts              # Search orchestrator — iterates locations, deduplicates, filters, outputs
├── format.ts           # Shared listing output formatter (json, csv, table) + pricePerSqft
├── logger.ts           # Shared pino logger instance (level via LOG_LEVEL env var)
├── attom/
│   ├── api.ts          # ATTOM API client (fetch, search, lookup, endpoint definitions)
│   ├── config.ts       # ATTOM-specific YAML config loading, search area expansion, types
│   └── format.ts       # ATTOM-specific output formatting (json, csv, table)
└── zillow/
    ├── api.ts          # Zillow API client via RapidAPI (search listings, property detail)
    └── types.ts        # TypeScript types for Zillow responses
config.yaml             # Unified search config — locations, search, filters, commute, output
.env.local              # API keys (ATTOM_API_KEY, RAPIDAPI_KEY)
```

## Data Sources

| Source     | Role                                                              | Status      |
| ---------- | ----------------------------------------------------------------- | ----------- |
| **ATTOM**  | Property enrichment — detailed data, valuations, sale/tax history | Implemented |
| **Zillow** | Listing discovery — active for-sale properties via RapidAPI       | Implemented |
| **Redfin** | Listing discovery — active for-sale properties                    | Not yet     |

## Commands

### Run (primary)

- `pnpm start run` — search all locations from config.yaml via Zillow, deduplicate, filter, output
- `pnpm start run -c my-config.yaml` — use custom config
- `pnpm start run -f json` — override output format
- `pnpm start run -o results.csv` — write to file instead of stdout

### ATTOM (direct API access)

- `pnpm start attom search` — search properties across areas defined in ATTOM config
- `pnpm start attom lookup <address1> <address2>` — look up a single property by address
- `pnpm start attom endpoints` — list available ATTOM API endpoints

### Zillow (direct API access)

- `pnpm start zillow search <location>` — search Zillow listings (by zip, city, or address)
- `pnpm start zillow search-coords <lat> <lng>` — search listings by coordinates
- `pnpm start zillow detail <zpid>` — get full property details by Zillow Property ID
- `pnpm start zillow address <address>` — get property details by street address
- `pnpm start zillow zestimate <zpid>` — get Zestimate for a property

## Configuration (config.yaml)

```yaml
locations: # List of cities/zips to search
search:
  home_status: # FOR_SALE | FOR_RENT | RECENTLY_SOLD
  sort: # DEFAULT | NEWEST | PRICE_LOW | PRICE_HIGH
filters:
  min_beds: # Minimum bedrooms
  min_baths: # Minimum bathrooms
  max_price: # Maximum listing price
  home_types: # Whitelist of home types (e.g. SINGLE_FAMILY)
commute:
  max_minutes: # Target commute time (informational)
  max_miles: # Straight-line distance filter (haversine)
  addresses: # List of {label, address, lat, lng}
output:
  format: # json | csv | table
  file: # null = stdout, or file path
```

## How It Works

### Run flow (unified)

1. `config.ts` loads `config.yaml` — locations, search params, filters, commute, output settings
2. `run.ts` iterates over locations, calls `zillow/api.ts:searchListings()` for each
3. Results are deduplicated by zpid (overlapping locations may return the same property)
4. Client-side filters are applied sequentially:
   - min_beds / min_baths
   - max_price
   - home_types whitelist (e.g. SINGLE_FAMILY only)
   - commute distance — haversine check, must be within `max_miles` of ALL commute addresses
5. `format.ts` outputs as JSON, CSV, or table (to stdout or file), including computed `pricePerSqft`

### ATTOM flow (direct)

1. `attom/config.ts` loads ATTOM-specific config and expands search areas (zips, geo, addresses, fips) into individual `SearchArea` objects
2. `attom/api.ts` iterates over areas, builds query strings with filters, and fetches from the ATTOM API
3. `attom/format.ts` extracts nested property fields and outputs as JSON, CSV, or table

### Zillow flow (direct)

1. `zillow/api.ts` sends requests to the RapidAPI "Real-Time Zillow Data" endpoint
2. `searchListings()` does filtered search via `/search` — returns normalized `ListingResult[]`
3. Handles both array and numeric-keyed object response formats from the API
4. `getPropertyDetail()` fetches full details via `/property-details` by zpid

## Current State

- Unified config-driven search via `pnpm start run`
- ATTOM integration works — search, lookup, and endpoint listing (via `attom` subcommands)
- Zillow integration works — listing search with filters, property detail by zpid
- Structured logging via pino (`LOG_LEVEL` env var — default `info`, set `debug` for verbose, `silent` to suppress)
- Client-side filtering: beds, baths, price, home type, commute distance (haversine)
- Derived `pricePerSqft` in all output formats
- dotenv loads `.env.local` explicitly via `config({ path: ".env.local" })`
- No property tracking/persistence yet
- No Redfin integration yet
- No tests
- No build step required for dev (tsx runs TS directly)
