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
2. Pick the highest-ROI skill from the curated list below
3. Print **one line**: `→ [skill-name]: [why in ≤8 words]`
4. Read that skill's file and execute it fully

No asking for permission. No re-explaining the choice. One line, then go.

---

## Step 1 — Read Context

Run this first, silently:

```bash
# Get orientation
git branch --show-current 2>/dev/null || echo "no git"
ls .planning/ 2>/dev/null && cat .planning/STATE.md 2>/dev/null | head -20 || echo "no .planning"
```

This tells you: is there an active GSD project? What phase are we on? That context affects routing.

---

## Step 2 — Intent → Skill Routing

Match the user's intent against this table. Use the **first match**.

### Tier 1: Code problems (something is broken)

| Intent signals | Skill | Path |
|---|---|---|
| "debug", "fix", "broken", "error", "failing", "exception", "crash", "why is X not", "stopped working" | **systematic-debugging** | `~/.claude/plugins/cache/superpowers-dev/superpowers/5.0.7/skills/systematic-debugging/SKILL.md` |
| "investigate", "root cause", "trace", "logs show", "diagnose" | **investigate** | `~/.claude/skills/investigate/SKILL.md` |

### Tier 2: Building something new

| Intent signals | Skill | Path |
|---|---|---|
| "build", "implement", "create", "add" + complex/multi-step/unclear scope | **brainstorm** → then follow through | `~/.claude/plugins/cache/superpowers-dev/superpowers/5.0.7/commands/brainstorm.md` |
| "build", "add", "implement" + clear/simple/known task | **gsd-quick** | `~/.claude/skills/gsd-quick/SKILL.md` |
| "refactor", "rewrite", "restructure" a non-trivial system | **brainstorm** first | `~/.claude/plugins/cache/superpowers-dev/superpowers/5.0.7/commands/brainstorm.md` |

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

## Step 3 — Output Format

Print exactly this, then immediately start executing:

```
→ [skill-name]: [reason in ≤8 words]
```

Examples:
```
→ systematic-debugging: memory_engine.py throwing KeyError on query
→ gsd-quick: clear task, no phase tracking needed
→ brainstorm: new feature, scope needs designing first
→ ship: branch is ready, time to PR
→ gsd-progress: checking where the project stands
```

Do NOT print:
- "I will now use..."
- "Let me invoke..."
- "I've decided to..."
- Any explanation beyond the one line

---

## Step 4 — Execute the Skill

Read the skill file at the path shown in the table. Follow its instructions completely, as if the user had invoked it directly.

Pass the user's original message as the argument/context to the skill.

**If the routed skill asks for `$ARGUMENTS`** — the value is the user's original message to Jarvis.

**If no row matches** — ask one focused question to clarify intent, then re-route. Do not guess wildly.

---

## Routing Principles

When two rows could match, prefer:

1. **Broken thing** → always Tier 1 first (fix before building)
2. **Unclear scope** → brainstorm over gsd-quick (5 min of design saves hours)
3. **Active .planning/ project** → prefer GSD skills (they track state)
4. **No .planning/ project** → prefer Superpowers skills (lighter weight)
5. **Simple + known** → gsd-quick over full brainstorm pipeline (avoid overhead)
6. **"Just do X"** with no ambiguity → gsd-quick, no questions asked
