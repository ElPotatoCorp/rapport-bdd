#!/usr/bin/env node
import { execSync } from "node:child_process";

const VALID_MODES = ["folder", "singlefile", "hybrid"];
const mode = process.argv[2] ?? "folder";

if (!VALID_MODES.includes(mode)) {
  console.error(`Unknown build mode "${mode}". Use one of: ${VALID_MODES.join(", ")}`);
  process.exit(1);
}

console.log(`\n📦 Building report in "${mode}" mode -> dist/${mode}/\n`);

execSync("vite build", {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "production",
    REPORT_BUILD_MODE: mode,
  },
});
