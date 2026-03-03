# househunter

Agent-driven tool for finding, enriching, and tracking residential property listings. Aggregates listings from multiple sources and enriches them with detailed property data.

## Setup

```bash
pnpm install
```

Add your API keys to `.env.local`:

```
RAPIDAPI_KEY=your-rapidapi-key
ATTOM_API_KEY=your-attom-api-key
```

## Usage

### Search all locations (primary command)

```bash
pnpm start run                     # Search config.yaml locations, output table
pnpm start run -f csv -o results.csv  # Export to CSV file
pnpm start run -f json             # JSON output to stdout
pnpm start run -c my-config.yaml   # Custom config file
```

### Zillow (direct API access)

```bash
pnpm start zillow search "Palo Alto, CA"       # Search listings by location
pnpm start zillow search-coords 37.44 -122.14  # Search by coordinates
pnpm start zillow detail 19497156               # Property details by zpid
pnpm start zillow address "123 Main St, City, ST 12345"  # Details by address
pnpm start zillow zestimate 19497156            # Zestimate by zpid
```

### ATTOM (direct API access)

```bash
pnpm start attom search                                  # Search using ATTOM config
pnpm start attom lookup "4529 Winona Court" "Denver, CO"  # Single property lookup
pnpm start attom endpoints                                # List available endpoints
```

## Configuration

Edit `config.yaml` to configure search locations, filters, and output:

```yaml
locations:
  - "Palo Alto, CA"
  - "Mountain View, CA"

search:
  home_status: FOR_SALE # FOR_SALE | FOR_RENT | RECENTLY_SOLD
  sort: NEWEST # DEFAULT | NEWEST | PRICE_LOW | PRICE_HIGH

filters:
  min_beds: 2
  min_baths: 2
  max_price: 2000000
  home_types:
    - SINGLE_FAMILY

commute:
  max_miles: 25 # Straight-line distance filter
  addresses:
    - label: "Office"
      address: "3000 Hanover Street, Palo Alto, CA"
      lat: 37.3957
      lng: -122.1467

output:
  format: table # json | csv | table
  file: null # null = stdout, or file path
```

## Logging

Structured logging via pino. Control verbosity with `LOG_LEVEL`:

```bash
LOG_LEVEL=debug pnpm start run    # Verbose output (includes API URLs)
LOG_LEVEL=silent pnpm start run   # Suppress all logs, data only
```

## Data Sources

| Source     | Role                                               | Status      |
| ---------- | -------------------------------------------------- | ----------- |
| **Zillow** | Listing discovery — active for-sale properties     | Implemented |
| **ATTOM**  | Property enrichment — valuations, sale/tax history | Implemented |
| **Redfin** | Listing discovery — active for-sale properties     | Not yet     |

## API Keys

- **Zillow**: Get a RapidAPI key at [rapidapi.com](https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-zillow-data)
- **ATTOM**: Get one at [developer.attomdata.com](https://api.developer.attomdata.com/home)

All keys go in `.env.local`.
