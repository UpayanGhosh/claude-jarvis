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

// ── Run install steps ────────────────────────────────────────────────────────
const src         = path.join(__dirname, "skills", "jarvis", "SKILL.md");
const skillDir    = path.join(os.homedir(), ".claude", "skills", "jarvis");
const gstackDir   = path.join(os.homedir(), ".claude", "skills", "gstack");
const pluginsFile = path.join(os.homedir(), ".claude", "plugins", "installed_plugins.json");

installSkill(src, skillDir);
installGSD();
installGstack(gstackDir);
installSuperpowers(pluginsFile);

// ── Done ─────────────────────────────────────────────────────────────────────
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const BOLD  = "\x1b[1m";
console.log(`
${GREEN}${BOLD}All done!${RESET}

Restart Claude Code, then try:

  ${BOLD}/jarvis I want to add rate limiting to the API${RESET}

Jarvis will pick the best skill automatically.
`);
