import { writeFileSync } from "node:fs";

type FieldKey =
  | "address"
  | "city"
  | "zip"
  | "type"
  | "beds"
  | "baths"
  | "sqft"
  | "year_built"
  | "lot_sqft";

const PROPERTY_FIELDS: Array<{ key: FieldKey; path: string[] }> = [
  { key: "address", path: ["address", "oneLine"] },
  { key: "city", path: ["address", "locality"] },
  { key: "zip", path: ["address", "postal1"] },
  { key: "type", path: ["summary", "proptype"] },
  { key: "beds", path: ["building", "rooms", "beds"] },
  { key: "baths", path: ["building", "rooms", "bathstotal"] },
  { key: "sqft", path: ["building", "size", "bldgsize"] },
  { key: "year_built", path: ["summary", "yearbuilt"] },
  { key: "lot_sqft", path: ["lot", "lotsize2"] },
];

type PropertyRow = Record<FieldKey, string>;

function dig(obj: Record<string, unknown>, path: string[]): unknown {
  let cur: unknown = obj;
  for (const k of path) {
    if (
      cur &&
      typeof cur === "object" &&
      k in (cur as Record<string, unknown>)
    ) {
      cur = (cur as Record<string, unknown>)[k];
    } else {
      return undefined;
    }
  }
  return cur;
}

function extractFields(p: Record<string, unknown>): PropertyRow {
  const row = {} as PropertyRow;
  for (const { key, path } of PROPERTY_FIELDS) {
    row[key] = String(dig(p, path) ?? "");
  }
  return row;
}

function formatJson(results: Record<string, unknown>[]): string {
  return JSON.stringify(results, null, 2);
}

function formatCsv(results: Record<string, unknown>[]): string {
  if (results.length === 0) return "";
  const keys = PROPERTY_FIELDS.map((f) => f.key);
  const rows = results.map((p) => {
    const fields = extractFields(p);
    return keys
      .map((k) => {
        const val = fields[k];
        return val.includes(",") ? `"${val}"` : val;
      })
      .join(",");
  });
  return [keys.join(","), ...rows].join("\n") + "\n";
}

function formatTable(results: Record<string, unknown>[]): string {
  if (results.length === 0) return "No results.";
  return results
    .map((p) => {
      const f = extractFields(p);
      return (
        `  ${f.address || "?"}\n` +
        `    Type: ${f.type || "?"} | Beds: ${f.beds || "?"} | Baths: ${f.baths || "?"} | Sqft: ${f.sqft || "?"} | Year: ${f.year_built || "?"}`
      );
    })
    .join("\n");
}

const FORMATTERS: Record<string, (r: Record<string, unknown>[]) => string> = {
  json: formatJson,
  csv: formatCsv,
  table: formatTable,
};

export function formatOutput(
  results: Record<string, unknown>[],
  fmt: string,
  outputFile?: string | null,
): void {
  const formatter = FORMATTERS[fmt] ?? formatJson;
  const out = formatter(results);

  if (outputFile) {
    writeFileSync(outputFile, out);
    process.stderr.write(`\u{1F4C1} Written to ${outputFile}\n`);
  } else {
    console.log(out);
  }
}
