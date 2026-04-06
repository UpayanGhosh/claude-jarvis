#!/usr/bin/env node
// CI check: ensures version is consistent across package.json, plugin.json, marketplace.json

"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const files = [
  { path: "package.json",                  get: (d) => d.version },
  { path: ".claude-plugin/plugin.json",     get: (d) => d.version },
  { path: ".claude-plugin/marketplace.json", get: (d) => d.plugins[0].version },
];

const versions = [];
let failed = false;

for (const f of files) {
  const fullPath = path.join(root, f.path);
  try {
    const data = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    const ver = f.get(data);
    versions.push({ file: f.path, version: ver });
    console.log(`  ${f.path}: ${ver}`);
  } catch (err) {
    console.error(`  ERROR reading ${f.path}: ${err.message}`);
    failed = true;
  }
}

const unique = new Set(versions.map((v) => v.version));
if (unique.size > 1) {
  console.error("\nVersion mismatch detected:");
  for (const v of versions) {
    console.error(`  ${v.file} -> ${v.version}`);
  }
  process.exit(1);
} else if (failed) {
  console.error("\nCould not read all version files.");
  process.exit(1);
} else {
  console.log(`\nAll versions in sync: ${versions[0].version}`);
}
