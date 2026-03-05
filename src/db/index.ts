import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import logger from "../logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = resolve(__dirname, "../../sql/schema.sql");

export async function getPool(connectionString: string): Promise<pg.Pool> {
  const pool = new pg.Pool({ connectionString });
  // Verify connectivity
  const client = await pool.connect();
  client.release();
  logger.debug("Database connected");
  return pool;
}

export async function initSchema(pool: pg.Pool): Promise<void> {
  const schema = readFileSync(SCHEMA_PATH, "utf-8");
  await pool.query(schema);
  logger.debug("Database schema initialized");
}

export async function close(pool: pg.Pool): Promise<void> {
  await pool.end();
}
