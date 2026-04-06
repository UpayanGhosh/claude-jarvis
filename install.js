#!/usr/bin/env node
// Postinstall: copies the jarvis skill into ~/.claude/skills/jarvis/

const fs = require("fs");
const path = require("path");
const os = require("os");

const src = path.join(__dirname, "skills", "jarvis", "SKILL.md");
const dest = path.join(os.homedir(), ".claude", "skills", "jarvis");
const destFile = path.join(dest, "SKILL.md");

try {
  fs.mkdirSync(dest, { recursive: true });
  fs.copyFileSync(src, destFile);
  console.log("✓ jarvis skill installed → ~/.claude/skills/jarvis/SKILL.md");
  console.log("  Restart Claude Code, then use: /jarvis I want to...");
} catch (err) {
  console.error("✗ Failed to install jarvis skill:", err.message);
  console.error("  Manual install: copy skills/jarvis/SKILL.md to ~/.claude/skills/jarvis/SKILL.md");
  process.exit(1);
}
