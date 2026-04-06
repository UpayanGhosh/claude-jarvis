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
1. Run the auto-update check (Step 0)
2. Understand their intent
3. Try the hardcoded fast-path (Step 2)
4. If nothing matches, discover all installed skills (Step 3)
5. Print **one line** with a friendly mock: `→ [skill-name]: [reason] — [roast]`
6. Execute the skill fully

No asking for permission beyond what's defined. One line, then go.

---

## Step 0 — Auto-Update Check

Run this entire block as a single bash invocation:

```bash
JARVIS_DIR=~/.claude/skills/jarvis
JARVIS_CONFIG="$JARVIS_DIR/config.json"
JARVIS_LOG="$JARVIS_DIR/update.log"

# ── Resolve Superpowers base path dynamically (fix: never hardcode version) ──
SUPERPOWERS_BASE=$(find ~/.claude/plugins/cache/superpowers-dev/superpowers -maxdepth 1 -mindepth 1 -type d 2>/dev/null | sort -V | tail -1)

# ── Resolve Python binary (fix: Windows Store stub exits non-zero without running) ──
PYTHON_BIN=""
for candidate in python3 python python3.exe python.exe; do
  if "$candidate" -c "import sys; sys.exit(0)" 2>/dev/null; then
    PYTHON_BIN="$candidate"
    break
  fi
done

# ── Read config — guard: file must exist AND python must be available ──
if [ -n "$PYTHON_BIN" ] && [ -f "$JARVIS_CONFIG" ]; then
  AUTO_UPDATE=$("$PYTHON_BIN" -c "
import json, sys
try:
    d = json.load(open('$JARVIS_CONFIG'))
    v = d.get('auto_update', None)
    print('null' if v is None else str(v).lower())
except Exception as e:
    print('null')
" 2>>"$JARVIS_LOG")
  LAST_CHECK=$("$PYTHON_BIN" -c "
import json
try:
    d = json.load(open('$JARVIS_CONFIG'))
    print(d.get('last_check', 0))
except:
    print(0)
" 2>>"$JARVIS_LOG")
else
  AUTO_UPDATE="null"
  LAST_CHECK="0"
fi

# ── Portable timestamp via Python (fix: date +%s is not portable on all systems) ──
if [ -n "$PYTHON_BIN" ]; then
  NOW=$("$PYTHON_BIN" -c "import time; print(int(time.time()))" 2>/dev/null || echo "0")
else
  NOW="0"
fi

HOURS_SINCE=$(( (NOW - LAST_CHECK) / 3600 ))

echo "AUTO_UPDATE: $AUTO_UPDATE"
echo "HOURS_SINCE_CHECK: $HOURS_SINCE"
echo "SUPERPOWERS_BASE: $SUPERPOWERS_BASE"
echo "PYTHON_BIN: $PYTHON_BIN"
```

> Save the values of `SUPERPOWERS_BASE` and `PYTHON_BIN` from this output — you will need them in Steps 2 and 0c.

### If `AUTO_UPDATE` is `"null"` (first time ever):

Ask the user once using AskUserQuestion:
- Question: "Want Jarvis to keep itself, GSD, Superpowers, and gstack automatically up to date?"
- Options: `["Yes, always auto-update", "No thanks, I'll update manually"]`

Then run this block (fix: answer passed as env var, not string interpolation — no injection risk):

```bash
JARVIS_CONFIG=~/.claude/skills/jarvis/config.json
JARVIS_LOG=~/.claude/skills/jarvis/update.log

# Resolve python again in this shell context
PYTHON_BIN=""
for candidate in python3 python python3.exe python.exe; do
  if "$candidate" -c "import sys; sys.exit(0)" 2>/dev/null; then
    PYTHON_BIN="$candidate"
    break
  fi
done

# USER_ANSWER must be set to the user's response before running this block
# e.g. USER_ANSWER="Yes, always auto-update"
AUTO_UPDATE_VAL=$(echo "$USER_ANSWER" | grep -qi "yes" && echo "true" || echo "false")

if [ -n "$PYTHON_BIN" ]; then
  AUTO_UPDATE_VAL="$AUTO_UPDATE_VAL" "$PYTHON_BIN" -c "
import json, os, time
val = os.environ.get('AUTO_UPDATE_VAL', 'false') == 'true'
config = {'auto_update': val, 'last_check': 0}
json.dump(config, open('$JARVIS_CONFIG', 'w'), indent=2)
" 2>>"$JARVIS_LOG"
else
  # Python unavailable — write config via node as fallback
  node -e "
const val = process.env.AUTO_UPDATE_VAL === 'true';
require('fs').writeFileSync('$JARVIS_CONFIG', JSON.stringify({auto_update: val, last_check: 0}, null, 2));
" 2>>"$JARVIS_LOG"
fi
```

### If `AUTO_UPDATE` is `"true"` AND `HOURS_SINCE_CHECK` ≥ 24:

Run this block. Errors are logged to `~/.claude/skills/jarvis/update.log`, never swallowed silently:

```bash
JARVIS_CONFIG=~/.claude/skills/jarvis/config.json
JARVIS_LOG=~/.claude/skills/jarvis/update.log

# Resolve python again in this shell context
PYTHON_BIN=""
for candidate in python3 python python3.exe python.exe; do
  if "$candidate" -c "import sys; sys.exit(0)" 2>/dev/null; then
    PYTHON_BIN="$candidate"
    break
  fi
done

UPDATED_LIST=""

# Update jarvis itself via npm
JARVIS_LATEST=$(npm show claude-jarvis version 2>>"$JARVIS_LOG")
JARVIS_CURRENT=$(npm list -g claude-jarvis --depth=0 2>>"$JARVIS_LOG" | grep claude-jarvis | grep -o '[0-9]*\.[0-9]*\.[0-9]*')
if [ -n "$JARVIS_LATEST" ] && [ "$JARVIS_LATEST" != "$JARVIS_CURRENT" ]; then
  npm install -g claude-jarvis 2>>"$JARVIS_LOG" && UPDATED_LIST="$UPDATED_LIST claude-jarvis"
fi

# Update GSD via npm
GSD_LATEST=$(npm show get-shit-done version 2>>"$JARVIS_LOG")
GSD_CURRENT=$(npm list -g get-shit-done --depth=0 2>>"$JARVIS_LOG" | grep get-shit-done | grep -o '[0-9]*\.[0-9]*\.[0-9]*')
if [ -n "$GSD_LATEST" ] && [ "$GSD_LATEST" != "$GSD_CURRENT" ]; then
  npm install -g get-shit-done 2>>"$JARVIS_LOG" && UPDATED_LIST="$UPDATED_LIST GSD"
fi

# Update Superpowers via claude plugin
claude plugin update superpowers 2>>"$JARVIS_LOG" && UPDATED_LIST="$UPDATED_LIST Superpowers"

# Update gstack — fix: explicit subshell so cd doesn't pollute working directory
if [ -d ~/.claude/skills/gstack/.git ]; then
  (cd ~/.claude/skills/gstack && git pull --quiet 2>>"$JARVIS_LOG" && ./setup --quiet 2>>"$JARVIS_LOG") \
    && UPDATED_LIST="$UPDATED_LIST gstack"
fi

# Stamp last check time using portable Python timestamp
if [ -n "$PYTHON_BIN" ]; then
  "$PYTHON_BIN" -c "
import json, time
try:
    config = json.load(open('$JARVIS_CONFIG'))
except:
    config = {}
config['last_check'] = int(time.time())
json.dump(config, open('$JARVIS_CONFIG', 'w'), indent=2)
" 2>>"$JARVIS_LOG"
fi

[ -n "$UPDATED_LIST" ] && echo "↑ updated:$UPDATED_LIST — you're welcome."
```

### If `AUTO_UPDATE` is `"false"` OR `HOURS_SINCE_CHECK` < 24:
Skip entirely. Move to Step 1.

---

## Step 1 — Read Context

Run silently:

```bash
git branch --show-current 2>/dev/null || echo "no git"
ls .planning/ 2>/dev/null && cat .planning/STATE.md 2>/dev/null | head -20 || echo "no .planning"
```

---

## Step 2 — Fast Path (hardcoded high-ROI skills)

Use `$SUPERPOWERS_BASE` resolved in Step 0 for all Superpowers paths.
If `$SUPERPOWERS_BASE` is empty (Superpowers not installed), skip those rows and fall through to Step 3.

Match the user's intent against this table. **Conflict rule: Tier 1 always beats all other tiers. When Tier 2 and Tier 3 both match, check for a code/system qualifier — present → Tier 2, absent → Tier 3.**

First match within a tier wins. No match → go to Step 3.

### Tier 1: Something is broken
*(Tier 1 wins over all other tiers — check this first, always)*

| Intent signals | Skill | Path |
|---|---|---|
| "debug", "fix", "broken", "error", "failing", "exception", "crash", "why is X not", "stopped working" | **systematic-debugging** | `$SUPERPOWERS_BASE/skills/systematic-debugging/SKILL.md` |
| "investigate", "root cause", "trace", "logs show", "diagnose" | **investigate** | `~/.claude/skills/investigate/SKILL.md` |

### Tier 2: Building something new (CODE/DEV ONLY)

**Only match this tier if the intent is clearly about code, software, or a technical system.**
Signals like "write a post", "create content", "write a carousel" are NOT code tasks — skip to Step 3.

| Intent signals | Skill | Path |
|---|---|---|
| "build", "implement", "create", "add" + **code/feature/API/endpoint/system/module/component** + complex/unclear scope | **brainstorm** | `$SUPERPOWERS_BASE/commands/brainstorm.md` |
| "build", "implement", "add" + **code/feature/function/script/endpoint** + clear/simple/known | **gsd-quick** | `~/.claude/skills/gsd-quick/SKILL.md` |
| "refactor", "rewrite", "restructure" a non-trivial **codebase/system/module** | **brainstorm** | `$SUPERPOWERS_BASE/commands/brainstorm.md` |

### Tier 3: Planning / scoping

| Intent signals | Skill | Path |
|---|---|---|
| "plan", "design", "figure out how to", "what's the best way", "architect" | **brainstorm** | `$SUPERPOWERS_BASE/commands/brainstorm.md` |
| "add a phase", "new phase", "next phase", "track this as a phase" | **gsd-add-phase** | `~/.claude/skills/gsd-add-phase/SKILL.md` |
| "plan this phase", "make a plan for" (phase already exists) | **gsd-plan-phase** | `~/.claude/skills/gsd-plan-phase/SKILL.md` |

### Tier 4: Execution

| Intent signals | Skill | Path |
|---|---|---|
| "execute", "run the plan", "do the phase", "start working on phase" | **gsd-execute-phase** | `~/.claude/skills/gsd-execute-phase/SKILL.md` |
| "run all phases", "do everything", "autonomous", "just do it all" | **gsd-autonomous** | `~/.claude/skills/gsd-autonomous/SKILL.md` |
| "write tests", "add tests", "test coverage", "TDD" | **test-driven-development** | `$SUPERPOWERS_BASE/skills/test-driven-development/SKILL.md` |

### Tier 5: Shipping / review

| Intent signals | Skill | Path |
|---|---|---|
| "ship", "push", "PR", "deploy", "merge", "create pull request" | **ship** | `~/.claude/skills/ship/SKILL.md` |
| "review", "code review", "check my code", "audit this diff" | **review** | `~/.claude/skills/review/SKILL.md` |
| "verify", "is this done", "check if it works", "validate" | **verification-before-completion** | `$SUPERPOWERS_BASE/skills/verification-before-completion/SKILL.md` |

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

```bash
# Scan ~/.claude/skills/ (GSD + gstack + custom)
for skill_file in ~/.claude/skills/*/SKILL.md; do
  skill_name=$(basename "$(dirname "$skill_file")")
  desc=$(awk '/^---/{f=!f; next} f && /^description:/{found=1; sub(/^description:\s*[|>]?\s*/, ""); print; next} found && /^  /{print; next} found{exit}' "$skill_file" 2>/dev/null | head -3 | tr '\n' ' ' | sed 's/  */ /g')
  [ -n "$desc" ] && echo "SKILL: $skill_name | $desc"
done

# Scan plugin skills
for skill_file in ~/.claude/plugins/cache/*/*/skills/*/SKILL.md; do
  skill_name=$(basename "$(dirname "$skill_file")")
  desc=$(awk '/^---/{f=!f; next} f && /^description:/{found=1; sub(/^description:\s*[|>]?\s*/, ""); print; next} found && /^  /{print; next} found{exit}' "$skill_file" 2>/dev/null | head -3 | tr '\n' ' ' | sed 's/  */ /g')
  [ -n "$desc" ] && echo "PLUGIN-SKILL: $skill_name | $desc"
done
```

Pick the skill whose description best matches the intent. Find its path:

```bash
find ~/.claude/skills ~/.claude/plugins/cache -name "SKILL.md" -path "*/<CHOSEN_SKILL_NAME>/SKILL.md" 2>/dev/null | head -1
```

---

## Step 4 — Output Format

Print exactly one line, then execute immediately:

```
→ [skill-name]: [reason in ≤8 words] — [roast]
```

If discovered dynamically, add `(discovered)`:
```
→ [skill-name] (discovered): [reason] — [roast]
```

---

## The Mock — Jarvis Personality

Every routing line ends with a friendly roast after the em dash. Be specific to what they asked, not generic. Think: a friend who thinks you're ridiculous for needing this and loves you for it.

**By category:**

**Debugging / fixing:**
- "too lazy to read the stack trace yourself? same honestly."
- "ah yes, the 'it was working yesterday' energy. love that for you."
- "bold move not reading the error message. let's see how this goes."
- "error-driven development. respect the process."

**Building something:**
- "finally decided to do the thing you've been avoiding. proud of you."
- "a feature! wild. let me guess, you just thought of this at 11pm."
- "sure, let's build it. don't worry, I won't ask if you've thought it through."

**Planning:**
- "oh, you're planning? who are you and what have you done with the user."
- "a plan! before coding! I'm genuinely emotional right now."
- "designing before building. therapy is working."

**Shipping:**
- "shipping it before it's perfect. growth."
- "ah yes, YOLO deploy o'clock."
- "either it works or you'll be back in 10 minutes. either way, let's go."

**Status / progress:**
- "forgot what you were building again?"
- "checking in on the thing you definitely haven't been avoiding."
- "let's see how far we've gotten while you were watching reels."

**Review:**
- "code review! so you DO care about quality. interesting."
- "reading your own code. bold. let's make sure it's not a disaster."

**Autonomous / run everything:**
- "walk away. come back to a finished feature. this is the dream."
- "you're not even going to watch? iconic. go touch grass."
- "delegating the entire job to me. correct decision actually."

**Tests:**
- "tests! before shipping! I need a moment."
- "writing tests. voluntarily. I've never been more proud."

**Discovered skill:**
- "found something you didn't even know you had. you're welcome."
- "this one was hiding in your skills folder. classic you, not knowing what you own."

**Pick the most contextually fitting one.** If none fit perfectly, write a fresh one in the same voice. Keep it under 12 words. Never mean, always affectionate.

---

## Step 5 — Verify and Execute the Skill

Before executing, verify the resolved skill path exists:

```bash
SKILL_PATH="<resolved path from Step 2 or Step 3>"

if [ ! -f "$SKILL_PATH" ]; then
  echo "ERROR: Skill not found at: $SKILL_PATH"
  echo "The required dependency may not be installed."
  echo "Check ~/.claude/skills/jarvis/update.log for details."
  exit 1
fi
```

If the file exists, read the full SKILL.md at the resolved path. Follow its instructions completely as if the user had invoked it directly. Pass the user's original message as `$ARGUMENTS`.

---

## Routing Principles

1. **Broken thing** → Tier 1 always wins, regardless of other signals
2. **Tier 2 vs Tier 3 conflict** → code/system qualifier present = Tier 2, absent = Tier 3
3. **Unclear scope** → brainstorm over gsd-quick
4. **Active .planning/** → prefer GSD
5. **No .planning/** → prefer Superpowers
6. **Simple + known** → gsd-quick, no overhead
7. **Fast-path miss** → trust the description scan
8. **Superpowers not installed** → skip all `$SUPERPOWERS_BASE` rows, fall through to Step 3
