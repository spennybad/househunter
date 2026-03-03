# attom-explorer

Simple CLI for exploring the [ATTOM Property API](https://api.developer.attomdata.com/docs).

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your ATTOM API key
```

## Usage

### Search properties using config filters

```bash
python attom.py search                          # Uses config.yaml defaults
python attom.py search -f table                 # Pretty table output
python attom.py search -f csv -o results.csv    # Export to CSV
python attom.py search -e sale                  # Use sale history endpoint
python attom.py search -c my-config.yaml        # Custom config
```

### Look up a single property

```bash
python attom.py lookup "4529 Winona Court" "Denver, CO"
python attom.py lookup "123 Main St" "Sunnyvale, CA" -e avm      # Get valuation
python attom.py lookup "123 Main St" "Sunnyvale, CA" -e sale      # Sale history
python attom.py lookup "123 Main St" "Sunnyvale, CA" -e assessment # Tax assessment
```

### List available endpoints

```bash
python attom.py endpoints
```

## Configuration

Edit `config.yaml` to set search areas, property types, price ranges, and filters. See comments in the file for all options.

### Supported property types
`SFR`, `CONDO`, `TOWNHOUSE`, `MOBILE`, `LAND`, `MULTI-FAMILY`, `OTHER`

### Search area types
- `geo` — GeoID or lat/lng + radius
- `zip` — Postal code
- `address` — Specific address
- `fips` — FIPS county code

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
