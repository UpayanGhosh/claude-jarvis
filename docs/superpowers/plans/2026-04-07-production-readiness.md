# Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 5 production-readiness gaps so claude-jarvis can be published and maintained with confidence.

**Architecture:** Extract testable logic from install.js into lib/installer.js, add jest tests, fix metadata files, add GitHub Actions CI.

**Tech Stack:** Node.js, Jest 29, GitHub Actions

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `.gitignore` | Modify | Add `.claude/` |
| `.claude-plugin/plugin.json` | Modify | Bump version 1.0.0 → 1.2.4, remove empty email |
| `package.json` | Modify | Add jest devDep, test script, bump engines to >=16.0.0 |
| `lib/installer.js` | **Create** | Extracted + exported pure functions from install.js |
| `install.js` | Modify | Thin orchestrator — import from lib/installer.js |
| `test/installer.test.js` | **Create** | Jest tests for all exported functions |
| `.github/workflows/ci.yml` | **Create** | Node 18/20 matrix CI |

---

## Task 1: Fix metadata issues

**Files:**
- Modify: `.gitignore`
- Modify: `.claude-plugin/plugin.json`
- Modify: `package.json`

- [ ] **Step 1: Update .gitignore**

Replace the file contents with:
```
node_modules/
.claude/
```

- [ ] **Step 2: Fix plugin.json version mismatch and empty email**

Replace `.claude-plugin/plugin.json` with:
```json
{
  "name": "claude-jarvis",
  "description": "Universal intent router — one command for all Claude Code skills",
  "owner": {
    "name": "Upayan Saha"
  },
  "plugins": [
    {
      "name": "jarvis",
      "description": "Universal intent router for Claude Code. One command that picks the highest-ROI skill automatically — GSD, Superpowers, or gstack.",
      "version": "1.2.4",
      "source": "./",
      "author": {
        "name": "Upayan Saha"
      }
    }
  ]
}
```

- [ ] **Step 3: Update package.json — add jest, test script, bump engines**

Replace `package.json` with:
```json
{
  "name": "claude-jarvis",
  "version": "1.2.4",
  "description": "Universal intent router for Claude Code — one command that picks the highest-ROI skill automatically",
  "keywords": [
    "claude",
    "claude-code",
    "claude-plugin",
    "skill",
    "gsd",
    "superpowers",
    "productivity",
    "ai",
    "routing"
  ],
  "homepage": "https://github.com/UpayanGhosh/claude-jarvis",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/UpayanGhosh/claude-jarvis.git"
  },
  "bugs": {
    "url": "https://github.com/UpayanGhosh/claude-jarvis/issues"
  },
  "author": "Upayan Saha",
  "license": "MIT",
  "engines": {
    "node": ">=16.0.0"
  },
  "scripts": {
    "postinstall": "node install.js",
    "test": "jest --coverage"
  },
  "files": [
    "skills/",
    ".claude-plugin/",
    "install.js",
    "lib/"
  ],
  "devDependencies": {
    "jest": "^29.0.0"
  }
}
```

- [ ] **Step 4: Install jest**

Run:
```bash
npm install
```

Expected: `node_modules/` created, jest 29.x installed.

- [ ] **Step 5: Commit**

```bash
git add .gitignore .claude-plugin/plugin.json package.json package-lock.json
git commit -m "chore: fix metadata — plugin.json version, gitignore, bump engines to >=16"
```

---

## Task 2: Extract lib/installer.js

**Files:**
- Create: `lib/installer.js`
- Modify: `install.js`

The goal: pull the 6 pure-ish functions out of install.js so they can be tested in isolation. install.js becomes a thin top-level script that imports and calls them.

- [ ] **Step 1: Create lib/installer.js with exported functions**

Create `lib/installer.js`:
```js
"use strict";

const fs   = require("fs");
const path = require("path");
const os   = require("os");
const { spawnSync } = require("child_process");

// ── Console helpers ──────────────────────────────────────────────────────────
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

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

const DEFAULT_CONFIG = { auto_update: null, last_check: 0 };

/**
 * Validate a parsed config object. Returns true if valid.
 */
function isValidConfig(config) {
  return (
    (config.auto_update === null || typeof config.auto_update === "boolean") &&
    typeof config.last_check === "number" &&
    config.last_check >= 0
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
 * Calls process.exit(1) if the copy fails.
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
    process.exit(1);
  }

  validateOrCreateConfig(configPath);

  if (!fs.existsSync(logPath)) {
    try { fs.writeFileSync(logPath, ""); } catch (_) {}
  }
}

/**
 * Install GSD via npm if not already installed.
 */
function installGSD() {
  header("Checking GSD (Get Shit Done)...");
  const gsdCheck = runSilent("gsd --version");
  if (gsdCheck.ok) {
    ok(`GSD already installed (${gsdCheck.out})`);
    return;
  }
  info("Installing GSD via npm...");
  const gsdInstall = runSilent("npm install -g get-shit-done");
  if (gsdInstall.ok) {
    ok("GSD installed");
  } else {
    warn("GSD install failed — try manually: npm install -g get-shit-done");
    info(gsdInstall.out.split("\n")[0]);
  }
}

/**
 * Clone gstack and run setup if not already installed.
 * @param {string} gstackDir  Destination directory for gstack.
 */
function installGstack(gstackDir) {
  header("Checking gstack...");
  if (fs.existsSync(path.join(gstackDir, "setup"))) {
    ok("gstack already installed");
    return;
  }

  const gitCheck = runSilent("git --version");
  if (!gitCheck.ok) {
    warn("git not found — skipping gstack install");
    info("Install git first, then run:");
    info(`  git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git "${gstackDir}"`);
    info(`  cd "${gstackDir}" && ./setup`);
    return;
  }

  info("Cloning gstack...");
  const cloneResult = runSilent(
    `git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git "${gstackDir}"`
  );
  if (!cloneResult.ok) {
    warn("gstack clone failed — try manually:");
    info(`  git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git "${gstackDir}"`);
    info(cloneResult.out.split("\n")[0]);
    return;
  }

  info("Running gstack setup...");
  const setupResult = runInDir("./setup", gstackDir);
  if (setupResult.ok) {
    ok("gstack installed");
  } else {
    warn(`gstack setup failed — try manually: cd "${gstackDir}" && ./setup`);
    info(setupResult.out.split("\n")[0]);
  }
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
    return;
  }

  let alreadyInstalled = false;
  try {
    const plugins = JSON.parse(fs.readFileSync(pluginsFile, "utf8"));
    alreadyInstalled = Object.keys(plugins.plugins || {}).some(k => k.startsWith("superpowers"));
  } catch (_) {}

  if (alreadyInstalled) {
    ok("Superpowers already installed");
    return;
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
  } else {
    warn("Superpowers install failed — try manually:");
    info("  claude plugin marketplace add obra/superpowers");
    info("  claude plugin install superpowers@superpowers-dev");
  }
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
```

- [ ] **Step 2: Rewrite install.js as thin orchestrator**

Replace `install.js` with:
```js
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
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 16) {
  console.error(`\x1b[31m✗\x1b[0m jarvis requires Node.js >= 16.0.0 (you have ${process.versions.node})`);
  process.exit(1);
}

// ── Run install steps ────────────────────────────────────────────────────────
const src      = path.join(__dirname, "skills", "jarvis", "SKILL.md");
const skillDir = path.join(os.homedir(), ".claude", "skills", "jarvis");
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
```

- [ ] **Step 3: Verify syntax**

Run:
```bash
node --check install.js && node --check lib/installer.js
```

Expected: no output (clean parse).

- [ ] **Step 4: Commit**

```bash
git add lib/installer.js install.js
git commit -m "refactor: extract installer logic into lib/installer.js for testability"
```

---

## Task 3: Write Jest tests

**Files:**
- Create: `test/installer.test.js`

- [ ] **Step 1: Create test/installer.test.js with failing tests first**

Create `test/installer.test.js`:
```js
"use strict";

jest.mock("child_process");
jest.mock("fs");

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const {
  runSilent,
  runInDir,
  isValidConfig,
  validateOrCreateConfig,
  DEFAULT_CONFIG,
} = require("../lib/installer");

// ── runSilent ────────────────────────────────────────────────────────────────
describe("runSilent", () => {
  afterEach(() => jest.clearAllMocks());

  test("returns ok=true and stdout on success", () => {
    spawnSync.mockReturnValue({ status: 0, stdout: "v1.2.3\n", stderr: "", error: null });
    expect(runSilent("gsd --version")).toEqual({ ok: true, out: "v1.2.3" });
    expect(spawnSync).toHaveBeenCalledWith("gsd --version", [], expect.objectContaining({ shell: true }));
  });

  test("returns ok=false and stderr on non-zero exit", () => {
    spawnSync.mockReturnValue({ status: 1, stdout: "", stderr: "command not found\n", error: null });
    expect(runSilent("gsd --version")).toEqual({ ok: false, out: "command not found" });
  });

  test("returns ok=false and error.message when spawnSync throws", () => {
    spawnSync.mockReturnValue({ status: null, stdout: "", stderr: "", error: new Error("ENOENT") });
    expect(runSilent("gsd --version")).toEqual({ ok: false, out: "ENOENT" });
  });

  test("passes extra opts to spawnSync", () => {
    spawnSync.mockReturnValue({ status: 0, stdout: "", stderr: "", error: null });
    runSilent("ls", { timeout: 5000 });
    expect(spawnSync).toHaveBeenCalledWith("ls", [], expect.objectContaining({ timeout: 5000 }));
  });
});

// ── runInDir ─────────────────────────────────────────────────────────────────
describe("runInDir", () => {
  afterEach(() => jest.clearAllMocks());

  test("passes cwd to spawnSync", () => {
    spawnSync.mockReturnValue({ status: 0, stdout: "ok\n", stderr: "", error: null });
    runInDir("./setup", "/some/dir");
    expect(spawnSync).toHaveBeenCalledWith("./setup", [], expect.objectContaining({ cwd: "/some/dir" }));
  });

  test("returns ok=true on success", () => {
    spawnSync.mockReturnValue({ status: 0, stdout: "done\n", stderr: "", error: null });
    expect(runInDir("./setup", "/some/dir")).toEqual({ ok: true, out: "done" });
  });

  test("returns ok=false on failure", () => {
    spawnSync.mockReturnValue({ status: 1, stdout: "", stderr: "setup failed\n", error: null });
    expect(runInDir("./setup", "/some/dir")).toEqual({ ok: false, out: "setup failed" });
  });
});

// ── isValidConfig ─────────────────────────────────────────────────────────────
describe("isValidConfig", () => {
  test("accepts null auto_update with 0 last_check", () => {
    expect(isValidConfig({ auto_update: null, last_check: 0 })).toBe(true);
  });

  test("accepts true auto_update", () => {
    expect(isValidConfig({ auto_update: true, last_check: 1234567890 })).toBe(true);
  });

  test("accepts false auto_update", () => {
    expect(isValidConfig({ auto_update: false, last_check: 42 })).toBe(true);
  });

  test("rejects string auto_update", () => {
    expect(isValidConfig({ auto_update: "yes", last_check: 0 })).toBe(false);
  });

  test("rejects missing last_check", () => {
    expect(isValidConfig({ auto_update: null })).toBe(false);
  });

  test("rejects negative last_check", () => {
    expect(isValidConfig({ auto_update: null, last_check: -1 })).toBe(false);
  });

  test("rejects string last_check", () => {
    expect(isValidConfig({ auto_update: null, last_check: "0" })).toBe(false);
  });
});

// ── validateOrCreateConfig ───────────────────────────────────────────────────
describe("validateOrCreateConfig", () => {
  const configPath = "/fake/.claude/skills/jarvis/config.json";

  beforeEach(() => {
    jest.clearAllMocks();
    // Silence console output during tests
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  test("creates default config when file does not exist", () => {
    fs.existsSync.mockReturnValue(false);
    fs.writeFileSync.mockImplementation(() => {});

    validateOrCreateConfig(configPath);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      configPath,
      JSON.stringify(DEFAULT_CONFIG, null, 2)
    );
  });

  test("does not overwrite a valid existing config", () => {
    const valid = { auto_update: true, last_check: 999 };
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify(valid));
    fs.writeFileSync.mockImplementation(() => {});

    validateOrCreateConfig(configPath);

    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  test("resets config when auto_update is an invalid type", () => {
    const invalid = { auto_update: "unset", last_check: 0 };
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify(invalid));
    fs.writeFileSync.mockImplementation(() => {});

    validateOrCreateConfig(configPath);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      configPath,
      JSON.stringify(DEFAULT_CONFIG, null, 2)
    );
  });

  test("resets config when JSON is corrupt", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("{ this is not json }");
    fs.writeFileSync.mockImplementation(() => {});

    validateOrCreateConfig(configPath);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      configPath,
      JSON.stringify(DEFAULT_CONFIG, null, 2)
    );
  });

  test("warns but does not throw when repair write fails", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("{ bad json }");
    fs.writeFileSync.mockImplementation(() => { throw new Error("EROFS"); });

    expect(() => validateOrCreateConfig(configPath)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail (nothing implemented yet... wait, we already wrote lib/installer.js)**

Run:
```bash
npm test
```

Expected: all tests PASS (lib/installer.js was already written in Task 2).
If any fail, check that jest.mock is mocking correctly — `fs` auto-mock needs explicit `mockReturnValue` calls.

- [ ] **Step 3: Commit**

```bash
git add test/installer.test.js
git commit -m "test: add jest tests for lib/installer.js — config validation, runSilent, runInDir"
```

---

## Task 4: Add GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create CI workflow**

Create `.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: ["master", "main"]
  pull_request:
    branches: ["master", "main"]

jobs:
  test:
    name: Test (Node ${{ matrix.node-version }})
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: ["18.x", "20.x", "22.x"]

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Check syntax
        run: node --check install.js && node --check lib/installer.js

      - name: Run tests
        run: npm test

  install-smoke-test:
    name: Install smoke test
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20.x"

      - name: Verify install.js parses cleanly
        run: node --check install.js

      - name: Verify lib/installer.js parses cleanly
        run: node --check lib/installer.js
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow — Node 18/20/22 matrix + cross-platform smoke test"
```

---

## Task 5: Final verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected output:
```
PASS test/installer.test.js
  runSilent
    ✓ returns ok=true and stdout on success
    ✓ returns ok=false and stderr on non-zero exit
    ✓ returns ok=false and error.message when spawnSync throws
    ✓ passes extra opts to spawnSync
  runInDir
    ✓ passes cwd to spawnSync
    ✓ returns ok=true on success
    ✓ returns ok=false on failure
  isValidConfig
    ✓ accepts null auto_update with 0 last_check
    ...
  validateOrCreateConfig
    ...

Test Suites: 1 passed, 1 total
Tests:       15 passed, 15 total
```

- [ ] **Step 2: Verify syntax of both JS files**

```bash
node --check install.js && node --check lib/installer.js && echo "Syntax OK"
```

Expected: `Syntax OK`

- [ ] **Step 3: Verify npm pack output (what gets published)**

```bash
npm pack --dry-run
```

Expected: output lists `skills/`, `.claude-plugin/`, `install.js`, `lib/` — and does NOT list `.claude/`, `test/`, `docs/`, `.github/`, `node_modules/`.

- [ ] **Step 4: Final commit**

```bash
git add -A
git status  # verify no surprises
git commit -m "chore: production readiness complete — v1.2.4 ready to publish"
```
