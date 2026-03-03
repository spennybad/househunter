import { writeFileSync } from "node:fs";
import type { ListingResult } from "./zillow/types.js";
import logger from "./logger.js";

function pricePerSqft(r: ListingResult): number | null {
  if (r.price == null || r.livingArea == null || r.livingArea === 0)
    return null;
  return Math.round(r.price / r.livingArea);
}

function formatJson(results: ListingResult[]): string {
  return JSON.stringify(
    results.map((r) => ({ ...r, pricePerSqft: pricePerSqft(r) })),
    null,
    2,
  );
}

function formatCsv(results: ListingResult[]): string {
  if (results.length === 0) return "";
  const keys: (keyof ListingResult)[] = [
    "zpid",
    "address",
    "city",
    "state",
    "zipcode",
    "price",
    "bedrooms",
    "bathrooms",
    "livingArea",
    "homeType",
    "homeStatus",
    "daysOnZillow",
    "zestimate",
    "detailUrl",
  ];
  const header = [...keys, "pricePerSqft"].join(",");
  const rows = results.map((r) => {
    const vals = keys.map((k) => {
      const val = String(r[k] ?? "");
      return val.includes(",") ? `"${val}"` : val;
    });
    vals.push(String(pricePerSqft(r) ?? ""));
    return vals.join(",");
  });
  return [header, ...rows].join("\n") + "\n";
}

function formatTable(results: ListingResult[]): string {
  if (results.length === 0) return "No results.";
  return results
    .map(
      (r) =>
        `  ${r.address}, ${r.city}, ${r.state} ${r.zipcode}` +
        `\n    $${r.price?.toLocaleString() ?? "?"} | $${pricePerSqft(r)?.toLocaleString() ?? "?"}/sqft | ${r.bedrooms ?? "?"}bd/${r.bathrooms ?? "?"}ba | ${r.livingArea?.toLocaleString() ?? "?"}sqft | ${r.homeType ?? "?"} | ${r.homeStatus ?? "?"} | ${r.daysOnZillow ?? "?"}d on Zillow`,
    )
    .join("\n");
}

const FORMATTERS: Record<string, (r: ListingResult[]) => string> = {
  json: formatJson,
  csv: formatCsv,
  table: formatTable,
};

export function formatListings(
  results: ListingResult[],
  fmt: string,
  outputFile?: string | null,
): void {
  const formatter = FORMATTERS[fmt] ?? formatTable;
  const out = formatter(results);

  if (outputFile) {
    writeFileSync(outputFile, out);
    logger.info("Written to %s", outputFile);
  } else {
    console.log(out);
  }
}
