#!/usr/bin/env node
// Postinstall: installs the jarvis skill file and bootstraps config.
// Recommended skills (GSD, Superpowers, gstack) are opt-in — Jarvis will ask
// on first use, not force-install here.

const path = require("path");
const os   = require("os");

const { installSkill } = require("./lib/installer");

// ── Guard: only run when installed directly or globally ──────────────────────
const isGlobal = process.env.npm_config_global === "true";
const isDirect = process.env.INIT_CWD && process.env.INIT_CWD === path.dirname(__dirname);
if (!isGlobal && !isDirect) {
  process.exit(0);
}

// ── Node version guard ───────────────────────────────────────────────────────
const [major] = process.versions.node.split(".").map(Number);
if (major < 16) {
  console.error(`\x1b[31m✗\x1b[0m jarvis requires Node.js >= 16.0.0 (you have ${process.versions.node})`);
  process.exit(1);
}

// ── Install core skill only ──────────────────────────────────────────────────
const src      = path.join(__dirname, "skills", "jarvis", "SKILL.md");
const skillDir = path.join(os.homedir(), ".claude", "skills", "jarvis");

const success = installSkill(src, skillDir);

if (!success) {
  console.error(`\x1b[31m\x1b[1mInstall failed.\x1b[0m The jarvis skill could not be installed.`);
  process.exit(1);
}

const RESET  = "\x1b[0m";
const GREEN  = "\x1b[32m";
const BOLD   = "\x1b[1m";
const DIM    = "\x1b[2m";

console.log(`
${GREEN}${BOLD}Jarvis installed!${RESET}

Restart Claude Code, then run:

  ${BOLD}/jarvis I want to add rate limiting to the API${RESET}

${DIM}On first use, Jarvis will ask if you want to install recommended skills
(GSD, Superpowers, gstack). You can say yes to all, pick specific ones, or skip.
Nothing extra is installed without your consent.${RESET}
`);
