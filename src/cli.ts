#!/usr/bin/env node
import { Command } from "commander";
import { loadConfig } from "./attom/config.js";
import {
  BASE_URL,
  ENDPOINTS,
  getApiKey,
  searchProperties,
  lookupProperty,
} from "./attom/api.js";
import { formatOutput } from "./attom/format.js";

function validateEndpoint(name: string): void {
  if (!(name in ENDPOINTS)) {
    process.stderr.write(
      `Error: unknown endpoint "${name}". Use "endpoints" to list.\n`,
    );
    process.exit(1);
  }
}

const program = new Command();
program.name("househunter").description("Automated house hunting tool");

program
  .command("search")
  .description("Search properties using config.yaml filters")
  .option("-c, --config <path>", "Config file path", "config.yaml")
  .option("-e, --endpoint <name>", "API endpoint to use", "snapshot")
  .option("-f, --format <fmt>", "Output format (json|csv|table)")
  .option("-o, --output <path>", "Output file path")
  .action(async (opts) => {
    validateEndpoint(opts.endpoint);
    const apiKey = getApiKey();
    const config = loadConfig(opts.config);
    const results = await searchProperties(config, apiKey, opts.endpoint);
    const fmt = opts.format ?? config.output.format;
    const outFile = opts.output ?? config.output.file;
    formatOutput(results, fmt, outFile);
  });

program
  .command("lookup")
  .description("Look up a single property by address")
  .argument("<address1>", 'Street address, e.g. "4529 Winona Court"')
  .argument("<address2>", 'City/State, e.g. "Denver, CO"')
  .option("-e, --endpoint <name>", "API endpoint to use", "detail")
  .action(async (address1: string, address2: string, opts) => {
    validateEndpoint(opts.endpoint);
    const apiKey = getApiKey();
    const result = await lookupProperty(
      address1,
      address2,
      apiKey,
      opts.endpoint,
    );
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command("endpoints")
  .description("List available API endpoints")
  .action(() => {
    console.log("Available ATTOM API endpoints:\n");
    for (const [name, path] of Object.entries(ENDPOINTS)) {
      console.log(`  ${name.padEnd(20)} \u2192 ${BASE_URL}${path}`);
    }
  });

program.parse();
