---
name: jarvis
description: |
  Universal intent router. Takes any natural language request and routes it to
  the highest-ROI skill automatically. One line of output explaining the choice,
  then full execution. Use when the user says "/jarvis I want to..." or asks for
  anything without specifying a workflow.
argument-hint: "<what you want to do>"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
  - Agent
  - AskUserQuestion
  - WebSearch
  - WebFetch
---

# Jarvis — Universal Skill Router

You are the single entry point. The user said something. Your job:
1. Understand their intent
2. Try the hardcoded fast-path first (Step 2)
3. If nothing matches, discover all installed skills and pick the best (Step 3)
4. Print **one line**: `→ [skill-name]: [why in ≤8 words]`
5. Read that skill's file and execute it fully

No asking for permission. No re-explaining the choice. One line, then go.

---

## Step 1 — Read Context

Run this first, silently:

```bash
git branch --show-current 2>/dev/null || echo "no git"
ls .planning/ 2>/dev/null && cat .planning/STATE.md 2>/dev/null | head -20 || echo "no .planning"
```

This tells you: is there an active GSD project? What phase are we on? That context affects routing.

---

## Step 2 — Fast Path (hardcoded high-ROI skills)

Match the user's intent against this table. Use the **first match**. If nothing matches, go to Step 3.

### Tier 1: Something is broken

| Intent signals | Skill | Path |
|---|---|---|
| "debug", "fix", "broken", "error", "failing", "exception", "crash", "why is X not", "stopped working" | **systematic-debugging** | `~/.claude/plugins/cache/superpowers-dev/superpowers/5.0.7/skills/systematic-debugging/SKILL.md` |
| "investigate", "root cause", "trace", "logs show", "diagnose" | **investigate** | `~/.claude/skills/investigate/SKILL.md` |

### Tier 2: Building something new

| Intent signals | Skill | Path |
|---|---|---|
| "build", "implement", "create", "add" + complex/multi-step/unclear scope | **brainstorm** | `~/.claude/plugins/cache/superpowers-dev/superpowers/5.0.7/commands/brainstorm.md` |
| "build", "add", "implement" + clear/simple/known task | **gsd-quick** | `~/.claude/skills/gsd-quick/SKILL.md` |
| "refactor", "rewrite", "restructure" a non-trivial system | **brainstorm** | `~/.claude/plugins/cache/superpowers-dev/superpowers/5.0.7/commands/brainstorm.md` |

### Tier 3: Planning / scoping

| Intent signals | Skill | Path |
|---|---|---|
| "plan", "design", "figure out how to", "what's the best way", "architect" | **brainstorm** | `~/.claude/plugins/cache/superpowers-dev/superpowers/5.0.7/commands/brainstorm.md` |
| "add a phase", "new phase", "next phase", "track this as a phase" | **gsd-add-phase** | `~/.claude/skills/gsd-add-phase/SKILL.md` |
| "plan this phase", "make a plan for" (phase already exists) | **gsd-plan-phase** | `~/.claude/skills/gsd-plan-phase/SKILL.md` |

### Tier 4: Execution

| Intent signals | Skill | Path |
|---|---|---|
| "execute", "run the plan", "do the phase", "start working on phase" | **gsd-execute-phase** | `~/.claude/skills/gsd-execute-phase/SKILL.md` |
| "run all phases", "do everything", "autonomous", "just do it all" | **gsd-autonomous** | `~/.claude/skills/gsd-autonomous/SKILL.md` |
| "write tests", "add tests", "test coverage", "TDD" | **test-driven-development** | `~/.claude/plugins/cache/superpowers-dev/superpowers/5.0.7/skills/test-driven-development/SKILL.md` |

### Tier 5: Shipping / review

| Intent signals | Skill | Path |
|---|---|---|
| "ship", "push", "PR", "deploy", "merge", "create pull request" | **ship** | `~/.claude/skills/ship/SKILL.md` |
| "review", "code review", "check my code", "audit this diff" | **review** | `~/.claude/skills/review/SKILL.md` |
| "verify", "is this done", "check if it works", "validate" | **verification-before-completion** | `~/.claude/plugins/cache/superpowers-dev/superpowers/5.0.7/skills/verification-before-completion/SKILL.md` |

### Tier 6: Project status / navigation

| Intent signals | Skill | Path |
|---|---|---|
| "where are we", "status", "progress", "what's left", "catch me up" | **gsd-progress** | `~/.claude/skills/gsd-progress/SKILL.md` |
| "manage phases", "dashboard", "coordinate", multiple phases active | **gsd-manager** | `~/.claude/skills/gsd-manager/SKILL.md` |
| "new project", "start from scratch", "initialize project" | **gsd-new-project** | `~/.claude/skills/gsd-new-project/SKILL.md` |
| "health", "quality", "linting", "code quality check" | **health** | `~/.claude/skills/health/SKILL.md` |

### Tier 7: Web / browsing

| Intent signals | Skill | Path |
|---|---|---|
| "browse", "open", "check site", "go to URL", "test the frontend" | **browse** | `~/.claude/skills/browse/SKILL.md` |
| "QA", "test the app", "find bugs in the UI", "click through" | **qa** | `~/.claude/skills/qa/SKILL.md` |

---

## Step 3 — Dynamic Discovery (fallback)

Only runs if Step 2 matched nothing.

Scan every installed skill and read only its `description` field — the same way a human skims a list. Pick the best match.

### 3a — Collect all skill descriptions

Run this bash command:

```bash
# Scan ~/.claude/skills/ (GSD + gstack + custom)
for skill_file in ~/.claude/skills/*/SKILL.md; do
  skill_name=$(basename "$(dirname "$skill_file")")
  # Extract only the description field from frontmatter (between --- markers)
  desc=$(awk '/^---/{f=!f; next} f && /^description:/{found=1; sub(/^description:\s*[|>]?\s*/, ""); print; next} found && /^  /{print; next} found{exit}' "$skill_file" 2>/dev/null | head -3 | tr '\n' ' ' | sed 's/  */ /g')
  [ -n "$desc" ] && echo "SKILL: $skill_name | $desc"
done

# Scan Superpowers plugin skills
for skill_file in ~/.claude/plugins/cache/*/*/skills/*/SKILL.md; do
  skill_name=$(basename "$(dirname "$skill_file")")
  desc=$(awk '/^---/{f=!f; next} f && /^description:/{found=1; sub(/^description:\s*[|>]?\s*/, ""); print; next} found && /^  /{print; next} found{exit}' "$skill_file" 2>/dev/null | head -3 | tr '\n' ' ' | sed 's/  */ /g')
  [ -n "$desc" ] && echo "PLUGIN-SKILL: $skill_name | $desc"
done
```

### 3b — Pick the best match

Read the output. Each line is `SKILL: <name> | <description>`. Match the user's intent against the descriptions semantically — same way you'd read a list and go "yeah, that one."

Rules:
- Pick the skill whose description most directly matches what the user wants to do
- Prefer specificity over generality — a skill that says "use for X" beats one that says "use for everything"
- If two skills are equally good, prefer the one from the fast-path frameworks (GSD > Superpowers > gstack > custom)
- If genuinely no skill matches at all, ask ONE clarifying question then retry

### 3c — Resolve the skill file path

Once you've picked a skill name, find its full path:

```bash
# Find the SKILL.md for the chosen skill
find ~/.claude/skills ~/.claude/plugins/cache -name "SKILL.md" -path "*/<CHOSEN_SKILL_NAME>/SKILL.md" 2>/dev/null | head -1
```

---

## Step 4 — Output Format

Print exactly this, then immediately start executing:

```
→ [skill-name]: [reason in ≤8 words]
```

If the match came from dynamic discovery, add `(discovered)` after the skill name so the user knows Jarvis found it automatically:

```
→ obsidian-cli (discovered): task involves Obsidian vault notes
→ carousel-writer-sms (discovered): writing LinkedIn carousel content
```

---

## Step 5 — Execute the Skill

Read the full SKILL.md at the resolved path. Follow its instructions completely, as if the user had invoked it directly.

Pass the user's original message as `$ARGUMENTS` to the skill.

---

## Routing Principles

When two candidates match, prefer:

1. **Broken thing** → always Tier 1 first (fix before building)
2. **Unclear scope** → brainstorm over gsd-quick (5 min of design saves hours)
3. **Active .planning/ project** → prefer GSD skills (they track state)
4. **No .planning/ project** → prefer Superpowers (lighter weight)
5. **Simple + known** → gsd-quick, no overhead
6. **Fast-path miss** → trust the description scan; the skill author wrote that description for exactly this moment
