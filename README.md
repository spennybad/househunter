# househunter

Agent-driven tool for finding, enriching, and tracking residential property listings. Aggregates listings from multiple sources (Zillow, Redfin, etc.) and enriches them with detailed property data from ATTOM.

## Setup

```bash
pnpm install
# Add your API keys to .env.local
```

## Data Sources

| Source     | Purpose                                                                        |
| ---------- | ------------------------------------------------------------------------------ |
| **Zillow** | Listing discovery — active for-sale properties                                 |
| **Redfin** | Listing discovery — active for-sale properties                                 |
| **ATTOM**  | Property enrichment — detailed data, valuations, sale history, tax assessments |

## Usage

### Search properties using config filters

```bash
pnpm start search                          # Uses config.yaml defaults
pnpm start search -- -f table              # Pretty table output
pnpm start search -- -f csv -o results.csv # Export to CSV
pnpm start search -- -e sale               # Use sale history endpoint
pnpm start search -- -c my-config.yaml     # Custom config
```

### Look up a single property

```bash
pnpm start lookup "4529 Winona Court" "Denver, CO"
pnpm start lookup "123 Main St" "Sunnyvale, CA" -- -e avm        # Get valuation
pnpm start lookup "123 Main St" "Sunnyvale, CA" -- -e sale        # Sale history
pnpm start lookup "123 Main St" "Sunnyvale, CA" -- -e assessment  # Tax assessment
```

### List available endpoints

```bash
pnpm start endpoints
```

## Configuration

Edit `config.yaml` to set search areas, property types, price ranges, and filters. See comments in the file for all options.

### Supported property types

`SFR`, `CONDO`, `TOWNHOUSE`, `MOBILE`, `LAND`, `MULTI-FAMILY`, `OTHER`

### Search area types

- `zips` — Postal codes grouped by city
- `geo` — Latitude/longitude + radius
- `addresses` — Specific street addresses
- `fips` — FIPS county codes

## ATTOM API Endpoints

| Endpoint          | Description                            |
| ----------------- | -------------------------------------- |
| `snapshot`        | Quick property overview                |
| `detail`          | Full property detail                   |
| `basicprofile`    | Basic profile                          |
| `expandedprofile` | Expanded profile with building details |
| `sale`            | Sale/transaction history               |
| `avm`             | Automated valuation model              |
| `assessment`      | Tax assessment data                    |

## API Keys

- **ATTOM**: Get one at [developer.attomdata.com](https://api.developer.attomdata.com/home)

All keys go in `.env.local`.
