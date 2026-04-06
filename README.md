# claude-jarvis

> The only Claude Code skill you need to remember.

**Jarvis** is a universal intent router. You describe what you want in plain English — it picks the highest-ROI skill from GSD, Superpowers, and gstack, tells you what it chose in one line, and executes it.

```
/jarvis I want to add rate limiting to the API
→ brainstorm: new feature, scope needs designing first
[executes Superpowers brainstorm → plan → subagent pipeline]

/jarvis why is memory_engine crashing on startup
→ systematic-debugging: exception on startup, root cause first
[executes 4-phase systematic debugging protocol]

/jarvis ship this
→ ship: branch ready, creating PR
[executes gstack ship workflow]
```

## Install

### Via npm (any machine)

```bash
npm install -g claude-jarvis
```

Copies the skill to `~/.claude/skills/jarvis/`. Restart Claude Code, done.

### Via Claude plugin system

```bash
claude plugin marketplace add upayansaha/claude-jarvis
claude plugin install jarvis@upayansaha
```

## Usage

```
/jarvis <anything you want to do>
```

That's it. One command. Jarvis handles the rest.

## What it routes to

| Your intent | Skill invoked |
|---|---|
| Something broken / error / failing | `systematic-debugging` (Superpowers) |
| Investigate / trace / diagnose | `investigate` (gstack) |
| Build something complex or unclear | `brainstorm` → full Superpowers pipeline |
| Build something simple / known | `gsd-quick` |
| Plan a feature or architecture | `brainstorm` |
| Add / plan / execute a GSD phase | GSD phase skills |
| Run all phases autonomously | `gsd-autonomous` |
| Write tests / TDD | `test-driven-development` (Superpowers) |
| Ship / PR / deploy | `ship` (gstack) |
| Code review | `review` (gstack) |
| Verify "is this done?" | `verification-before-completion` (Superpowers) |
| Project status / where are we | `gsd-progress` |
| Browse / test the UI | `browse` / `qa` (gstack) |
| Code quality check | `health` (gstack) |

## Requirements

Jarvis routes to skills from three systems. Install what you use:

- **GSD** — [get-shit-done](https://github.com/gsd-cli/get-shit-done)
- **Superpowers** — `claude plugin install superpowers@superpowers-dev` (after `claude plugin marketplace add obra/superpowers`)
- **gstack** — [gstack.dev](https://gstack.dev)

Jarvis works even if you only have one of these installed — it routes to what's available.

## How it decides

1. Broken thing → always fix first (`systematic-debugging`)
2. Unclear scope → `brainstorm` over quick execution
3. Active `.planning/` project → prefer GSD (tracks state)
4. No `.planning/` → prefer Superpowers (lighter weight)
5. Simple + known → `gsd-quick`, no overhead

## License

MIT
