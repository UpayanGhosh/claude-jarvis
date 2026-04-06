#!/usr/bin/env node
// Postinstall: installs jarvis skill + all dependencies (GSD, Superpowers, gstack)

const path = require("path");
const os   = require("os");

const {
  installSkill,
  installGSD,
  installGstack,
  installSuperpowers,
} = require("./lib/installer");

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

// ── Run install steps and track results ──────────────────────────────────────
const src         = path.join(__dirname, "skills", "jarvis", "SKILL.md");
const skillDir    = path.join(os.homedir(), ".claude", "skills", "jarvis");
const gstackDir   = path.join(os.homedir(), ".claude", "skills", "gstack");
const pluginsFile = path.join(os.homedir(), ".claude", "plugins", "installed_plugins.json");

const results = {
  "jarvis skill": installSkill(src, skillDir),
  "GSD":          installGSD(),
  "gstack":       installGstack(gstackDir),
  "Superpowers":  installSuperpowers(pluginsFile),
};

// ── Report results honestly ──────────────────────────────────────────────────
const RESET  = "\x1b[0m";
const GREEN  = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BOLD   = "\x1b[1m";

const failures = Object.entries(results).filter(([, ok]) => !ok).map(([name]) => name);

if (failures.length === 0) {
  console.log(`
${GREEN}${BOLD}All done!${RESET}

Restart Claude Code, then try:

  ${BOLD}/jarvis I want to add rate limiting to the API${RESET}

Jarvis will pick the best skill automatically.
`);
} else if (!results["jarvis skill"]) {
  console.error(`
${YELLOW}${BOLD}Install failed.${RESET} The core jarvis skill could not be installed.
Run again or see README for manual install steps.
`);
  process.exit(1);
} else {
  console.log(`
${YELLOW}${BOLD}Partially installed.${RESET} These failed: ${failures.join(", ")}

Jarvis will still work, but some skills won't be available.
Run ${BOLD}npm install -g claude-jarvis${RESET} again, or install the failed deps manually (see README).
`);
}
