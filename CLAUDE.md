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
- PostgreSQL 17 (Docker) for persistence
- sqlc for type-safe SQL query generation
- pg (node-postgres) as the database driver

## Project Structure

```
src/
├── cli.ts              # CLI entry point — subcommands: run, attom, zillow, db
├── config.ts           # Unified config loader (locations, search, filters, commute, output, db)
├── run.ts              # Search orchestrator — coordinate search (or per-location fallback), deduplicates, filters, persists, outputs
├── format.ts           # Shared listing output formatter (json, csv, table) + pricePerSqft
├── logger.ts           # Shared pino logger instance (level via LOG_LEVEL env var)
├── attom/
│   ├── api.ts          # ATTOM API client (fetch, search, lookup, endpoint definitions)
│   ├── config.ts       # ATTOM-specific YAML config loading, search area expansion, types
│   └── format.ts       # ATTOM-specific output formatting (json, csv, table)
├── zillow/
│   ├── api.ts          # Zillow API client via RapidAPI (search listings, property detail)
│   └── types.ts        # TypeScript types for Zillow responses
└── db/
    ├── index.ts        # DB pool, schema init, close
    ├── convert.ts      # fromZillow() — ListingResult → UpsertListingArgs
    ├── seed.ts         # CSV seed script (tsx src/db/seed.ts [file.csv])
    └── generated/
        └── query_sql.ts  # sqlc-generated typed queries (DO NOT EDIT)
sql/
├── schema.sql          # Postgres DDL — listings + listing_snapshots tables
└── query.sql           # sqlc-annotated queries
sqlc.yaml               # sqlc config — Postgres + ts plugin + pg driver
docker-compose.yaml     # Postgres 17 container with persistent volume
config.yaml             # Unified search config — locations, search, filters, commute, output, db
.env.local              # API keys (ATTOM_API_KEY, RAPIDAPI_KEY)
```

## Data Sources

| Source       | Role                                                              | Status      |
| ------------ | ----------------------------------------------------------------- | ----------- |
| **ATTOM**    | Property enrichment — detailed data, valuations, sale/tax history | Implemented |
| **Zillow**   | Listing discovery — active for-sale properties via RapidAPI       | Implemented |
| **Postgres** | Persistence — listing tracking, snapshots, change detection       | Implemented |
| **Redfin**   | Listing discovery — active for-sale properties                    | Not yet     |

## Commands

### Run (primary)

- `pnpm start run` — search all locations from config.yaml via Zillow, deduplicate, filter, persist to DB, output
- `pnpm start run -c my-config.yaml` — use custom config
- `pnpm start run -f json` — override output format
- `pnpm start run -o results.csv` — write to file instead of stdout

### DB

- `pnpm start db init` — create/update database schema (idempotent, safe to re-run)
- `pnpm start db stats` — show listing counts by source (total, active, inactive) and snapshot count

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

### sqlc Codegen

- `pnpm db:generate` — regenerate `src/db/generated/query_sql.ts` from `sql/query.sql`

## Configuration (config.yaml)

```yaml
locations: # List of cities/zips to search (also used as city whitelist filter)
search:
  home_status: # FOR_SALE | FOR_RENT | RECENTLY_SOLD
  sort: # DEFAULT | NEWEST | PRICE_LOW | PRICE_HIGH
  radius: # Miles from first commute address for coordinate search (falls back to commute.max_miles)
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
db:
  url: # Postgres connection string (default: postgresql://househunter:househunter@localhost:5432/househunter)
```

## How It Works

### Run flow (unified)

1. `config.ts` loads `config.yaml` — locations, search params, filters, commute, output, db settings
2. `run.ts` searches for listings via Zillow:
   - **Coordinate search (default when commute addresses exist):** Uses the first commute address as center, `search.radius` (or `commute.max_miles`) as radius, makes a single `searchByCoordinates()` call with pagination
   - **Per-location fallback:** If no commute addresses, iterates `config.locations` and calls `searchListings()` for each
3. Results are deduplicated by zpid (overlapping pages/locations may return the same property)
4. Client-side filters are applied sequentially:
   - min_beds / min_baths
   - max_price
   - home_types whitelist (e.g. SINGLE_FAMILY only)
   - commute distance — haversine check, must be within `max_miles` of ALL commute addresses
   - city whitelist — only keep listings whose city matches an entry in `config.locations`
5. Filtered listings are converted via `db/convert.ts:fromZillow()` to source-agnostic `UpsertListingArgs`
6. Each listing is upserted into the `listings` table (insert or update on conflict), and a snapshot is recorded in `listing_snapshots`
7. Listings not in the current result set are marked `is_active = false` via `markInactive`
8. DB stats (total/active/inactive counts, snapshot count) are logged
9. `format.ts` outputs as JSON, CSV, or table (to stdout or file), including computed `pricePerSqft`

### ATTOM flow (direct)

1. `attom/config.ts` loads ATTOM-specific config and expands search areas (zips, geo, addresses, fips) into individual `SearchArea` objects
2. `attom/api.ts` iterates over areas, builds query strings with filters, and fetches from the ATTOM API
3. `attom/format.ts` extracts nested property fields and outputs as JSON, CSV, or table

### Zillow flow (direct)

1. `zillow/api.ts` sends requests to the RapidAPI "Real-Time Zillow Data" endpoint
2. `searchListings()` does filtered search via `/search` — returns normalized `ListingResult[]`
3. Handles both array and numeric-keyed object response formats from the API
4. `getPropertyDetail()` fetches full details via `/property-details` by zpid

## Database Schema

Two tables track listings over time:

### `listings`

Canonical listing record. One row per unique property per source.

| Column         | Type        | Notes                                    |
| -------------- | ----------- | ---------------------------------------- |
| id             | SERIAL PK   |                                          |
| source         | TEXT        | `'zillow'`, `'redfin'`, etc.             |
| source_id      | TEXT        | zpid for Zillow                          |
| address        | TEXT        |                                          |
| city/state/zip | TEXT        |                                          |
| price          | INTEGER     | Current listing price                    |
| bedrooms       | INTEGER     |                                          |
| bathrooms      | REAL        |                                          |
| living_area    | INTEGER     | sqft                                     |
| lot_area_value | REAL        |                                          |
| year_built     | INTEGER     |                                          |
| home_type      | TEXT        | e.g. SINGLE_FAMILY                       |
| home_status    | TEXT        | e.g. FOR_SALE                            |
| latitude       | REAL        |                                          |
| longitude      | REAL        |                                          |
| img_src        | TEXT        |                                          |
| detail_url     | TEXT        |                                          |
| source_data    | JSONB       | Source-specific fields (zestimate, etc.) |
| first_seen_at  | TIMESTAMPTZ | When first discovered                    |
| last_seen_at   | TIMESTAMPTZ | Updated on every upsert                  |
| is_active      | BOOLEAN     | false = no longer in search results      |

**UNIQUE constraint:** `(source, source_id)` — upserts update existing rows rather than creating duplicates.

### `listing_snapshots`

Point-in-time snapshot recorded on every sync run. Enables price/status change tracking.

| Column      | Type        | Notes                                |
| ----------- | ----------- | ------------------------------------ |
| id          | SERIAL PK   |                                      |
| listing_id  | INTEGER FK  | References `listings(id)`            |
| price       | INTEGER     | Price at time of observation         |
| home_status | TEXT        | Status at time of observation        |
| source_data | JSONB       | Source-specific fields at this point |
| observed_at | TIMESTAMPTZ | Defaults to `now()`                  |

Indexes on `listing_id` and `observed_at` for efficient querying.

## sqlc Workflow

To modify database queries:

1. Edit `sql/query.sql` — add or modify sqlc-annotated queries
2. Edit `sql/schema.sql` if table changes are needed
3. Run `pnpm db:generate` — regenerates `src/db/generated/query_sql.ts`
4. Import and use the generated functions in application code

**Never edit `src/db/generated/query_sql.ts` directly** — it is overwritten on every `pnpm db:generate`.

## Agent Operations Guide

This section documents the exact commands and workflow for agents (e.g. OpenClaw) driving Househunter via shell commands.

### Prerequisites

Before running any commands:

1. **Docker Desktop** must be running
2. **Start Postgres:** `docker compose up -d` (from the project root)
3. **`.env.local`** must exist with API keys: `ATTOM_API_KEY` and `RAPIDAPI_KEY`
4. **Dependencies installed:** `pnpm install` (if not already)

### Daily Sync Workflow

```bash
cd /Users/spennybad/workspace/househunter
pnpm start run                  # Search → filter → persist → output
pnpm start db stats             # Verify sync results
```

The `run` command handles everything: API calls, deduplication, filtering, DB upsert, marking inactive listings, and output. Each run creates a snapshot per listing for change tracking.

### Querying the Database Directly

Connect via psql:

```bash
docker compose exec db psql -U househunter -d househunter
```

Or use the connection string: `postgresql://househunter:househunter@localhost:5432/househunter`

**Get all active listings:**

```sql
SELECT address, city, price, bedrooms, bathrooms, living_area, home_status
FROM listings
WHERE is_active = true
ORDER BY price;
```

**Find price drops (comparing snapshots):**

```sql
SELECT l.address, l.city, s1.price AS previous_price, s2.price AS current_price,
       s1.price - s2.price AS drop
FROM listing_snapshots s1
JOIN listing_snapshots s2 ON s1.listing_id = s2.listing_id
JOIN listings l ON l.id = s1.listing_id
WHERE s2.observed_at > s1.observed_at
  AND s2.price < s1.price
ORDER BY drop DESC;
```

**Find new listings since a date:**

```sql
SELECT address, city, price, bedrooms, bathrooms, first_seen_at
FROM listings
WHERE first_seen_at >= '2026-03-01'
ORDER BY first_seen_at DESC;
```

**Find deactivated (delisted) properties:**

```sql
SELECT address, city, price, last_seen_at
FROM listings
WHERE is_active = false
ORDER BY last_seen_at DESC;
```

### Troubleshooting

| Problem                      | Fix                                                          |
| ---------------------------- | ------------------------------------------------------------ |
| Postgres not running         | `docker compose up -d`                                       |
| Connection refused           | Check Docker Desktop is running, then `docker compose up -d` |
| Schema out of date           | `pnpm start db init`                                         |
| sqlc generated code outdated | `pnpm db:generate`                                           |
| API key errors               | Verify `.env.local` has `ATTOM_API_KEY` and `RAPIDAPI_KEY`   |

## Current State

- Unified config-driven search via `pnpm start run`
- ATTOM integration works — search, lookup, and endpoint listing (via `attom` subcommands)
- Zillow integration works — listing search with filters, property detail by zpid
- Postgres persistence — listings upserted, snapshots recorded per run, inactive tracking
- Docker Compose for local Postgres 17 with persistent volume
- sqlc for type-safe query generation (ts plugin, pg driver)
- CSV seed script (`tsx src/db/seed.ts [file.csv]`) for bulk-loading historical data
- Structured logging via pino (`LOG_LEVEL` env var — default `info`, set `debug` for verbose, `silent` to suppress)
- Client-side filtering: beds, baths, price, home type, commute distance (haversine)
- Derived `pricePerSqft` in all output formats
- dotenv loads `.env.local` explicitly via `config({ path: ".env.local" })`
- No Redfin integration yet
- No tests
- No build step required for dev (tsx runs TS directly)
