#!/usr/bin/env node
// Postinstall: installs jarvis skill + all dependencies (GSD, Superpowers, gstack)

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

function ok(msg) { console.log(`${GREEN}✓${RESET} ${msg}`); }
function warn(msg) { console.log(`${YELLOW}⚠${RESET}  ${msg}`); }
function fail(msg) { console.log(`${RED}✗${RESET} ${msg}`); }
function info(msg) { console.log(`${DIM}  ${msg}${RESET}`); }
function header(msg) { console.log(`\n${BOLD}${msg}${RESET}`); }

function run(cmd, opts = {}) {
  return execSync(cmd, { stdio: opts.silent ? "pipe" : "inherit", ...opts }).toString().trim();
}

function runSilent(cmd) {
  try { return { ok: true, out: run(cmd, { silent: true }) }; }
  catch (e) { return { ok: false, out: e.message }; }
}

// ─── 1. Install jarvis SKILL.md ──────────────────────────────────────────────
header("Installing jarvis skill...");

const src = path.join(__dirname, "skills", "jarvis", "SKILL.md");
const skillDir = path.join(os.homedir(), ".claude", "skills", "jarvis");
const skillDest = path.join(skillDir, "SKILL.md");

try {
  fs.mkdirSync(skillDir, { recursive: true });
  fs.copyFileSync(src, skillDest);
  ok(`jarvis skill → ~/.claude/skills/jarvis/SKILL.md`);
} catch (err) {
  fail(`Could not install jarvis skill: ${err.message}`);
  process.exit(1);
}

// ─── 2. Install GSD ──────────────────────────────────────────────────────────
header("Checking GSD (Get Shit Done)...");

const gsdCheck = runSilent("gsd --version");
if (gsdCheck.ok) {
  ok(`GSD already installed (${gsdCheck.out})`);
} else {
  info("Installing GSD via npm...");
  const gsdInstall = runSilent("npm install -g get-shit-done");
  if (gsdInstall.ok) {
    ok("GSD installed");
  } else {
    warn("GSD install failed — try manually: npm install -g get-shit-done");
    info(gsdInstall.out.split("\n")[0]);
  }
}

// ─── 3. Install gstack ───────────────────────────────────────────────────────
header("Checking gstack...");

const gstackDir = path.join(os.homedir(), ".claude", "skills", "gstack");
const gstackExists = fs.existsSync(path.join(gstackDir, "setup"));

if (gstackExists) {
  ok("gstack already installed");
} else {
  const gitCheck = runSilent("git --version");
  if (!gitCheck.ok) {
    warn("git not found — skipping gstack install");
    info("Install git first, then run: git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup");
  } else {
    info("Cloning gstack...");
    const cloneResult = runSilent(
      `git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git "${gstackDir}"`
    );
    if (!cloneResult.ok) {
      warn("gstack clone failed — try manually:");
      info(`git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack`);
    } else {
      info("Running gstack setup...");
      const setupResult = runSilent(`cd "${gstackDir}" && ./setup`);
      if (setupResult.ok) {
        ok("gstack installed");
      } else {
        warn("gstack setup failed — try manually: cd ~/.claude/skills/gstack && ./setup");
      }
    }
  }
}

// ─── 4. Install Superpowers ──────────────────────────────────────────────────
header("Checking Superpowers...");

const claudeCheck = runSilent("claude --version");
if (!claudeCheck.ok) {
  warn("Claude Code CLI not found — skipping Superpowers install");
  info("Install Claude Code first: https://claude.ai/code");
} else {
  // Check if already installed
  const pluginsFile = path.join(os.homedir(), ".claude", "plugins", "installed_plugins.json");
  let alreadyInstalled = false;

  try {
    const plugins = JSON.parse(fs.readFileSync(pluginsFile, "utf8"));
    alreadyInstalled = Object.keys(plugins.plugins || {}).some(k => k.startsWith("superpowers"));
  } catch (_) {}

  if (alreadyInstalled) {
    ok("Superpowers already installed");
  } else {
    info("Registering obra/superpowers marketplace...");
    const mktAdd = runSilent("claude plugin marketplace add obra/superpowers");
    if (!mktAdd.ok) {
      warn("Could not register marketplace — may already exist");
    }

    info("Installing Superpowers plugin...");
    const spInstall = runSilent("claude plugin install superpowers@superpowers-dev");
    if (spInstall.ok) {
      ok("Superpowers installed");
    } else {
      warn("Superpowers install failed — try manually:");
      info("claude plugin marketplace add obra/superpowers");
      info("claude plugin install superpowers@superpowers-dev");
    }
  }
}

// ─── Done ────────────────────────────────────────────────────────────────────
console.log(`
${GREEN}${BOLD}All done!${RESET}

Restart Claude Code, then try:

  ${BOLD}/jarvis I want to add rate limiting to the API${RESET}

Jarvis will pick the best skill automatically.
`);
