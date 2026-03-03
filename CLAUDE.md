# Househunter

Agent-driven tool for finding, enriching, and tracking residential property listings over time.

## Big Picture

This tool is designed to be used by agents to find houses for sale that meet very specific criteria. It works in layers:

1. **Listing discovery** — Aggregate active for-sale listings from consumer sources (Zillow, Redfin, etc.) via APIs and/or web scraping
2. **Property enrichment** — Use ATTOM to get in-depth data on specific properties (valuations, sale history, tax assessments, building details) that complement the listing data
3. **Tracking** — Build and maintain a collection of properties over time, tracking changes in price, status, and availability

## API Docs

- ATTOM Property API: https://api.developer.attomdata.com/docs

## Tech Stack

- TypeScript (strict mode, ES2022 target, Node16 modules)
- pnpm for package management
- Commander for CLI parsing
- js-yaml for config parsing
- dotenv for env loading
- tsx for running TypeScript directly

## Project Structure

```
src/
├── cli.ts              # CLI entry point — 3 commands: search, lookup, endpoints
└── attom/
    ├── api.ts          # ATTOM API client (fetch, search, lookup, endpoint definitions)
    ├── config.ts       # YAML config loading, search area expansion, types
    └── format.ts       # Output formatting (json, csv, table)
config.yaml             # Search config — areas, filters, price, output settings
.env.local              # API keys
```

## Data Sources

| Source     | Role                                                              | Status      |
| ---------- | ----------------------------------------------------------------- | ----------- |
| **ATTOM**  | Property enrichment — detailed data, valuations, sale/tax history | Implemented |
| **Zillow** | Listing discovery — active for-sale properties                    | Not yet     |
| **Redfin** | Listing discovery — active for-sale properties                    | Not yet     |

## Commands

- `pnpm start search` — search properties across areas defined in config.yaml
- `pnpm start lookup <address1> <address2>` — look up a single property by address
- `pnpm start endpoints` — list available API endpoints

## How It Works (current)

1. `config.ts` loads `config.yaml` and expands search areas (zips, geo, addresses, fips) into individual `SearchArea` objects with query params
2. `api.ts` iterates over areas, builds query strings with filters, and fetches from the ATTOM API (30s timeout, apikey header)
3. `format.ts` extracts nested property fields and outputs as JSON, CSV, or table
4. `cli.ts` wires it all together with Commander

## Current State

- ATTOM integration works — search, lookup, and endpoint listing
- Supports 7 ATTOM endpoints: snapshot, detail, basicprofile, expandedprofile, sale, avm, assessment
- Config supports zip codes, geo coords, street addresses, and FIPS codes as search areas
- No listing discovery yet (Zillow/Redfin)
- No property tracking/persistence yet
- No tests
- No build step required for dev (tsx runs TS directly)
- `dotenv/config` is imported in api.ts — it loads `.env` automatically but `getApiKey()` also manually reads `.env` as a fallback
