# househunter

Automated house hunting CLI for exploring the [ATTOM Property API](https://api.developer.attomdata.com/docs).

## Setup

```bash
pnpm install
# Add your ATTOM API key to .env.local
```

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

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `snapshot` | Quick property overview |
| `detail` | Full property detail |
| `basicprofile` | Basic profile |
| `expandedprofile` | Expanded profile with building details |
| `sale` | Sale/transaction history |
| `avm` | Automated valuation model |
| `assessment` | Tax assessment data |

## API Key

Get one at [developer.attomdata.com](https://api.developer.attomdata.com/home). Set via `.env` file or `ATTOM_API_KEY` env var.
