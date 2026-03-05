-- name: UpsertListing :one
INSERT INTO listings (
  source, source_id, address, city, state, zipcode,
  price, bedrooms, bathrooms, living_area, lot_area_value,
  year_built, home_type, home_status, latitude, longitude,
  img_src, detail_url, source_data
) VALUES (
  $1, $2, $3, $4, $5, $6,
  $7, $8, $9, $10, $11,
  $12, $13, $14, $15, $16,
  $17, $18, $19
)
ON CONFLICT(source, source_id) DO UPDATE SET
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  state = EXCLUDED.state,
  zipcode = EXCLUDED.zipcode,
  price = EXCLUDED.price,
  bedrooms = EXCLUDED.bedrooms,
  bathrooms = EXCLUDED.bathrooms,
  living_area = EXCLUDED.living_area,
  lot_area_value = EXCLUDED.lot_area_value,
  year_built = EXCLUDED.year_built,
  home_type = EXCLUDED.home_type,
  home_status = EXCLUDED.home_status,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  img_src = EXCLUDED.img_src,
  detail_url = EXCLUDED.detail_url,
  source_data = EXCLUDED.source_data,
  last_seen_at = now(),
  is_active = true
RETURNING id;

-- name: InsertSnapshot :exec
INSERT INTO listing_snapshots (listing_id, price, home_status, source_data)
VALUES ($1, $2, $3, $4);

-- name: MarkInactive :exec
UPDATE listings
SET is_active = false
WHERE source = $1
  AND is_active = true
  AND source_id != ALL(sqlc.arg('active_source_ids')::text[]);

-- name: GetStats :many
SELECT
  source,
  COUNT(*)::int AS total,
  COUNT(*) FILTER (WHERE is_active)::int AS active,
  COUNT(*) FILTER (WHERE NOT is_active)::int AS inactive
FROM listings
GROUP BY source;

-- name: GetSnapshotCount :one
SELECT COUNT(*)::int AS count FROM listing_snapshots;
