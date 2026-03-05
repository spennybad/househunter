import { QueryArrayConfig, QueryArrayResult } from "pg";

interface Client {
  query: (config: QueryArrayConfig) => Promise<QueryArrayResult>;
}

export const upsertListingQuery = `-- name: UpsertListing :one
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
RETURNING id`;

export interface UpsertListingArgs {
  source: string;
  sourceId: string;
  address: string;
  city: string | null;
  state: string | null;
  zipcode: string | null;
  price: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  livingArea: number | null;
  lotAreaValue: number | null;
  yearBuilt: number | null;
  homeType: string | null;
  homeStatus: string | null;
  latitude: number | null;
  longitude: number | null;
  imgSrc: string | null;
  detailUrl: string | null;
  sourceData: any | null;
}

export interface UpsertListingRow {
  id: number;
}

export async function upsertListing(
  client: Client,
  args: UpsertListingArgs,
): Promise<UpsertListingRow | null> {
  const result = await client.query({
    text: upsertListingQuery,
    values: [
      args.source,
      args.sourceId,
      args.address,
      args.city,
      args.state,
      args.zipcode,
      args.price,
      args.bedrooms,
      args.bathrooms,
      args.livingArea,
      args.lotAreaValue,
      args.yearBuilt,
      args.homeType,
      args.homeStatus,
      args.latitude,
      args.longitude,
      args.imgSrc,
      args.detailUrl,
      args.sourceData,
    ],
    rowMode: "array",
  });
  if (result.rows.length !== 1) {
    return null;
  }
  const row = result.rows[0];
  return {
    id: row[0],
  };
}

export const insertSnapshotQuery = `-- name: InsertSnapshot :exec
INSERT INTO listing_snapshots (listing_id, price, home_status, source_data)
VALUES ($1, $2, $3, $4)`;

export interface InsertSnapshotArgs {
  listingId: number;
  price: number | null;
  homeStatus: string | null;
  sourceData: any | null;
}

export async function insertSnapshot(
  client: Client,
  args: InsertSnapshotArgs,
): Promise<void> {
  await client.query({
    text: insertSnapshotQuery,
    values: [args.listingId, args.price, args.homeStatus, args.sourceData],
    rowMode: "array",
  });
}

export const markInactiveQuery = `-- name: MarkInactive :exec
UPDATE listings
SET is_active = false
WHERE source = $1
  AND is_active = true
  AND source_id != ALL($2::text[])`;

export interface MarkInactiveArgs {
  source: string;
  activeSourceIds: string[];
}

export async function markInactive(
  client: Client,
  args: MarkInactiveArgs,
): Promise<void> {
  await client.query({
    text: markInactiveQuery,
    values: [args.source, args.activeSourceIds],
    rowMode: "array",
  });
}

export const getStatsQuery = `-- name: GetStats :many
SELECT
  source,
  COUNT(*)::int AS total,
  COUNT(*) FILTER (WHERE is_active)::int AS active,
  COUNT(*) FILTER (WHERE NOT is_active)::int AS inactive
FROM listings
GROUP BY source`;

export interface GetStatsRow {
  source: string;
  total: number;
  active: number;
  inactive: number;
}

export async function getStats(client: Client): Promise<GetStatsRow[]> {
  const result = await client.query({
    text: getStatsQuery,
    values: [],
    rowMode: "array",
  });
  return result.rows.map((row) => {
    return {
      source: row[0],
      total: row[1],
      active: row[2],
      inactive: row[3],
    };
  });
}

export const getSnapshotCountQuery = `-- name: GetSnapshotCount :one
SELECT COUNT(*)::int AS count FROM listing_snapshots`;

export interface GetSnapshotCountRow {
  count: number;
}

export async function getSnapshotCount(
  client: Client,
): Promise<GetSnapshotCountRow | null> {
  const result = await client.query({
    text: getSnapshotCountQuery,
    values: [],
    rowMode: "array",
  });
  if (result.rows.length !== 1) {
    return null;
  }
  const row = result.rows[0];
  return {
    count: row[0],
  };
}
