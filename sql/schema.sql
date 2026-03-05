CREATE TABLE IF NOT EXISTS listings (
  id              SERIAL PRIMARY KEY,
  source          TEXT NOT NULL,       -- 'zillow', 'redfin', etc.
  source_id       TEXT NOT NULL,       -- zpid for zillow, listing ID for redfin, etc.
  address         TEXT NOT NULL,
  city            TEXT,
  state           TEXT,
  zipcode         TEXT,
  price           INTEGER,
  bedrooms        INTEGER,
  bathrooms       REAL,
  living_area     INTEGER,
  lot_area_value  REAL,
  year_built      INTEGER,
  home_type       TEXT,
  home_status     TEXT,
  latitude        REAL,
  longitude       REAL,
  img_src         TEXT,
  detail_url      TEXT,
  source_data     JSONB,              -- source-specific fields
  first_seen_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(source, source_id)
);

CREATE TABLE IF NOT EXISTS listing_snapshots (
  id              SERIAL PRIMARY KEY,
  listing_id      INTEGER NOT NULL REFERENCES listings(id),
  price           INTEGER,
  home_status     TEXT,
  source_data     JSONB,              -- JSON snapshot of source-specific fields at this point
  observed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_listing ON listing_snapshots(listing_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_observed ON listing_snapshots(observed_at);
