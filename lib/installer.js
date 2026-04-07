"use strict";

const fs   = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

// ── Console helpers ──────────────────────────────────────────────────────────
const RESET  = "\x1b[0m";
const GREEN  = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED    = "\x1b[31m";
const BOLD   = "\x1b[1m";
const DIM    = "\x1b[2m";

function ok(msg)     { console.log(`${GREEN}✓${RESET} ${msg}`); }
function warn(msg)   { console.log(`${YELLOW}⚠${RESET}  ${msg}`); }
function fail(msg)   { console.log(`${RED}✗${RESET} ${msg}`); }
function info(msg)   { console.log(`${DIM}  ${msg}${RESET}`); }
function header(msg) { console.log(`\n${BOLD}${msg}${RESET}`); }

// ── Process runners ──────────────────────────────────────────────────────────

/**
 * Run a shell command silently. Returns { ok: boolean, out: string }.
 */
function runSilent(cmd, opts) {
  const result = spawnSync(cmd, [], {
    shell: true,
    encoding: "utf8",
    ...(opts || {}),
  });
  if (result.error || result.status !== 0) {
    return { ok: false, out: (result.stderr || (result.error && result.error.message) || "").trim() };
  }
  return { ok: true, out: (result.stdout || "").trim() };
}

/**
 * Run a shell command inside a specific directory. Returns { ok: boolean, out: string }.
 */
function runInDir(cmd, cwd) {
  const result = spawnSync(cmd, [], {
    shell: true,
    encoding: "utf8",
    cwd,
  });
  if (result.error || result.status !== 0) {
    return { ok: false, out: (result.stderr || (result.error && result.error.message) || "").trim() };
  }
  return { ok: true, out: (result.stdout || "").trim() };
}

// ── Config validation ────────────────────────────────────────────────────────

const DEFAULT_CONFIG = { auto_update: null, last_check: 0, deps_asked: false };

/**
 * Validate a parsed config object. Returns true if valid.
 */
function isValidConfig(config) {
  return (
    (config.auto_update === null || typeof config.auto_update === "boolean") &&
    typeof config.last_check === "number" &&
    config.last_check >= 0 &&
    typeof config.deps_asked === "boolean"
  );
}

/**
 * Ensure configPath contains a valid config.json.
 * Creates with defaults if missing. Repairs if corrupt/invalid.
 */
function validateOrCreateConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
    ok("Created default config.json");
    return;
  }

  try {
    const existing = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (!isValidConfig(existing)) {
      fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
      warn("config.json had invalid values — reset to defaults");
    } else {
      ok("config.json already exists and is valid");
    }
  } catch (_) {
    try {
      fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
      warn("config.json was corrupted — reset to defaults");
    } catch (err) {
      warn(`Could not repair config.json: ${err.message}`);
    }
  }
}

// ── Install steps ────────────────────────────────────────────────────────────

/**
 * Copy SKILL.md from src to skillDir, create config.json and update.log.
 * Returns true on success, false on failure.
 */
function installSkill(src, skillDir) {
  header("Installing jarvis skill...");
  const skillDest  = path.join(skillDir, "SKILL.md");
  const configPath = path.join(skillDir, "config.json");
  const logPath    = path.join(skillDir, "update.log");

  try {
    fs.mkdirSync(skillDir, { recursive: true });
    fs.copyFileSync(src, skillDest);
    ok(`jarvis skill → ${skillDest}`);
  } catch (err) {
    fail(`Could not install jarvis skill: ${err.message}`);
    return false;
  }

  validateOrCreateConfig(configPath);

  if (!fs.existsSync(logPath)) {
    try { fs.writeFileSync(logPath, ""); } catch (_) {}
  }
  return true;
}

/**
 * Install GSD via npm if not already installed. Returns true on success.
 */
function installGSD() {
  header("Checking GSD (Get Shit Done)...");
  const gsdCheck = runSilent("gsd --version");
  if (gsdCheck.ok) {
    ok(`GSD already installed (${gsdCheck.out})`);
    return true;
  }
  info("Installing GSD via npm...");
  const gsdInstall = runSilent("npm install -g get-shit-done");
  if (gsdInstall.ok) {
    ok("GSD installed");
    return true;
  }
  warn("GSD install failed — try manually: npm install -g get-shit-done");
  info(gsdInstall.out.split("\n")[0]);
  return false;
}

/**
 * Clone gstack and run setup if not already installed.
 * @param {string} gstackDir  Destination directory for gstack.
 */
function installGstack(gstackDir) {
  header("Checking gstack...");
  if (fs.existsSync(path.join(gstackDir, "setup"))) {
    ok("gstack already installed");
    return true;
  }

  const gitCheck = runSilent("git --version");
  if (!gitCheck.ok) {
    warn("git not found — skipping gstack install");
    info("Install git first, then run:");
    info(`  git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git "${gstackDir}"`);
    info(`  cd "${gstackDir}" && ./setup`);
    return false;
  }

  info("Cloning gstack...");
  const cloneResult = runSilent(
    `git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git "${gstackDir}"`
  );
  if (!cloneResult.ok) {
    warn("gstack clone failed — try manually:");
    info(`  git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git "${gstackDir}"`);
    info(cloneResult.out.split("\n")[0]);
    return false;
  }

  info("Running gstack setup...");
  const setupResult = runInDir("./setup", gstackDir);
  if (setupResult.ok) {
    ok("gstack installed");
    return true;
  }
  warn(`gstack setup failed — try manually: cd "${gstackDir}" && ./setup`);
  info(setupResult.out.split("\n")[0]);
  return false;
}

/**
 * Install Superpowers plugin if Claude CLI is available.
 * @param {string} pluginsFile  Path to installed_plugins.json.
 */
function installSuperpowers(pluginsFile) {
  header("Checking Superpowers...");
  const claudeCheck = runSilent("claude --version");
  if (!claudeCheck.ok) {
    warn("Claude Code CLI not found — skipping Superpowers install");
    info("Install Claude Code first: https://claude.ai/code");
    return false;
  }

  let alreadyInstalled = false;
  try {
    const plugins = JSON.parse(fs.readFileSync(pluginsFile, "utf8"));
    alreadyInstalled = Object.keys(plugins.plugins || {}).some(k => k.startsWith("superpowers"));
  } catch (_) {}

  if (alreadyInstalled) {
    ok("Superpowers already installed");
    return true;
  }

  info("Registering obra/superpowers marketplace...");
  const mktAdd = runSilent("claude plugin marketplace add obra/superpowers");
  if (!mktAdd.ok) {
    warn("Could not register marketplace — may already exist");
  }

  info("Installing Superpowers plugin...");
  const spInstall = runSilent("claude plugin install superpowers@superpowers-dev");
  if (spInstall.ok) {
    ok("Superpowers installed");
    return true;
  }
  warn("Superpowers install failed — try manually:");
  info("  claude plugin marketplace add obra/superpowers");
  info("  claude plugin install superpowers@superpowers-dev");
  return false;
}

module.exports = {
  runSilent,
  runInDir,
  isValidConfig,
  validateOrCreateConfig,
  installSkill,
  installGSD,
  installGstack,
  installSuperpowers,
  DEFAULT_CONFIG,
};
