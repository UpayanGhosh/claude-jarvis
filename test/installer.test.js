"use strict";

jest.mock("child_process");
jest.mock("fs");

const { spawnSync } = require("child_process");
const fs = require("fs");

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

  test("returns ok=true and trimmed stdout on success", () => {
    spawnSync.mockReturnValue({ status: 0, stdout: "v1.2.3\n", stderr: "", error: null });
    expect(runSilent("gsd --version")).toEqual({ ok: true, out: "v1.2.3" });
    expect(spawnSync).toHaveBeenCalledWith(
      "gsd --version",
      [],
      expect.objectContaining({ shell: true, encoding: "utf8" })
    );
  });

  test("returns ok=false and trimmed stderr on non-zero exit", () => {
    spawnSync.mockReturnValue({ status: 1, stdout: "", stderr: "command not found\n", error: null });
    expect(runSilent("gsd --version")).toEqual({ ok: false, out: "command not found" });
  });

  test("returns ok=false with error.message when spawnSync sets error", () => {
    spawnSync.mockReturnValue({ status: null, stdout: "", stderr: "", error: new Error("ENOENT") });
    expect(runSilent("gsd --version")).toEqual({ ok: false, out: "ENOENT" });
  });

  test("passes extra opts through to spawnSync", () => {
    spawnSync.mockReturnValue({ status: 0, stdout: "", stderr: "", error: null });
    runSilent("ls", { timeout: 5000 });
    expect(spawnSync).toHaveBeenCalledWith(
      "ls",
      [],
      expect.objectContaining({ timeout: 5000 })
    );
  });
});

// ── runInDir ─────────────────────────────────────────────────────────────────
describe("runInDir", () => {
  afterEach(() => jest.clearAllMocks());

  test("passes cwd to spawnSync", () => {
    spawnSync.mockReturnValue({ status: 0, stdout: "ok\n", stderr: "", error: null });
    runInDir("./setup", "/some/dir");
    expect(spawnSync).toHaveBeenCalledWith(
      "./setup",
      [],
      expect.objectContaining({ cwd: "/some/dir" })
    );
  });

  test("returns ok=true and trimmed stdout on success", () => {
    spawnSync.mockReturnValue({ status: 0, stdout: "done\n", stderr: "", error: null });
    expect(runInDir("./setup", "/some/dir")).toEqual({ ok: true, out: "done" });
  });

  test("returns ok=false and stderr on failure", () => {
    spawnSync.mockReturnValue({ status: 1, stdout: "", stderr: "setup failed\n", error: null });
    expect(runInDir("./setup", "/some/dir")).toEqual({ ok: false, out: "setup failed" });
  });

  test("returns ok=false with error.message on spawn error", () => {
    spawnSync.mockReturnValue({ status: null, stdout: "", stderr: "", error: new Error("EACCES") });
    expect(runInDir("./setup", "/some/dir")).toEqual({ ok: false, out: "EACCES" });
  });
});

// ── isValidConfig ─────────────────────────────────────────────────────────────
describe("isValidConfig", () => {
  test("accepts null auto_update with 0 last_check (default state)", () => {
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

  test("rejects numeric auto_update", () => {
    expect(isValidConfig({ auto_update: 1, last_check: 0 })).toBe(false);
  });

  test("rejects missing last_check", () => {
    expect(isValidConfig({ auto_update: null })).toBe(false);
  });

  test("rejects string last_check", () => {
    expect(isValidConfig({ auto_update: null, last_check: "0" })).toBe(false);
  });

  test("rejects negative last_check", () => {
    expect(isValidConfig({ auto_update: null, last_check: -1 })).toBe(false);
  });
});

// ── validateOrCreateConfig ───────────────────────────────────────────────────
describe("validateOrCreateConfig", () => {
  const configPath = "/fake/.claude/skills/jarvis/config.json";

  beforeEach(() => {
    jest.clearAllMocks();
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
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify({ auto_update: true, last_check: 999 }));
    fs.writeFileSync.mockImplementation(() => {});

    validateOrCreateConfig(configPath);

    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  test("resets config when auto_update is an invalid string", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify({ auto_update: "unset", last_check: 0 }));
    fs.writeFileSync.mockImplementation(() => {});

    validateOrCreateConfig(configPath);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      configPath,
      JSON.stringify(DEFAULT_CONFIG, null, 2)
    );
  });

  test("resets config when last_check is negative", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify({ auto_update: null, last_check: -5 }));
    fs.writeFileSync.mockImplementation(() => {});

    validateOrCreateConfig(configPath);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      configPath,
      JSON.stringify(DEFAULT_CONFIG, null, 2)
    );
  });

  test("resets config when JSON is corrupt", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("{ this is not valid json }");
    fs.writeFileSync.mockImplementation(() => {});

    validateOrCreateConfig(configPath);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      configPath,
      JSON.stringify(DEFAULT_CONFIG, null, 2)
    );
  });

  test("does not throw when repair write fails (warns and continues)", () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue("{ bad json }");
    fs.writeFileSync.mockImplementation(() => { throw new Error("EROFS: read-only file system"); });

    expect(() => validateOrCreateConfig(configPath)).not.toThrow();
  });
});
