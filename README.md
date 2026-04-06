# claude-jarvis

> I was too lazy to pick an AI skill. So I built an AI skill that picks AI skills for me.

Hi. I'm a lazy developer.

Not "I don't feel like writing tests today" lazy. I mean *pathologically, clinically, aggressively* lazy. I'm so lazy I have a keyboard shortcut to close tabs I don't want to read. I'm so lazy I automated my standup. I'm so lazy that when someone told me there were 50+ Claude Code skills available across GSD, Superpowers, and gstack — skills that could 10x my productivity — my first thought was:

**"That's too many things to remember."**

So I did what any self-respecting lazy developer would do. I asked Claude to figure it out for me. I said: *"Build me one single skill that understands what I want and picks the best skill automatically."*

It did.

Now I type `/jarvis I want to do this thing` and the correct workflow just... happens. I don't know which skill it used. I don't care. My job is to describe the vibe. Jarvis handles the rest.

And here's the part that genuinely surprised me — it doesn't just know the skills I hardcoded. It scans every single skill installed on your machine and reads the descriptions. Like a human skimming a list. So when you install a new skill tomorrow, Jarvis already knows how to use it. You don't tell it anything. It just figures it out.

I have genuinely freed up 40% of my brain for more important things. Like scrolling reels.

---

## What Jarvis Does

You tell it what you want in plain English. It reads your project state, figures out the highest-ROI skill from 50+ options across three frameworks, tells you what it picked in one line, and executes it.

```
/jarvis I want to add rate limiting to the API
→ brainstorm: new feature, scope needs designing first
[full Superpowers design → plan → execute pipeline kicks in]

/jarvis why is memory_engine crashing on startup
→ systematic-debugging: exception on startup, root cause first
[4-phase root cause investigation, no random guessing]

/jarvis ship this
→ ship: branch ready, creating PR
[tests, diff review, VERSION bump, PR — done]

/jarvis where are we
→ gsd-progress: checking project state
[full milestone status, what's done, what's next]
```

That's the whole interface. One command. Infinite skills.

---

## Install

One command. It auto-installs GSD and Superpowers for you too, because obviously you're not going to do that yourself.

```bash
npm install -g claude-jarvis
```

Restart Claude Code. Done. Go back to your reels.

### Alternatively, via Claude plugin system

```bash
claude plugin marketplace add UpayanGhosh/claude-jarvis
claude plugin install jarvis@UpayanGhosh
```

---

## Usage

```
/jarvis <describe what you want like a normal human being>
```

That's it. That's the whole docs. You're welcome.

---

## What's Happening Under the Hood

*(You don't need to read this. Jarvis knows. But here you go.)*

Jarvis runs a two-stage routing system:

**Stage 1 — Fast path.** 15 hardcoded high-ROI skills that cover 95% of what developers actually do. Instant match, zero overhead.

**Stage 2 — Dynamic discovery.** If Stage 1 misses, Jarvis scans every `SKILL.md` in `~/.claude/skills/` and your installed plugins, reads only the `description` field from each one — same way a human skims a list — and picks the best match semantically. When it finds something this way it tells you:

```
→ carousel-writer-sms (discovered): writing LinkedIn carousel content
→ obsidian-cli (discovered): task involves Obsidian vault notes
```

The `(discovered)` tag means Jarvis found it on your machine automatically. You installed a new skill yesterday and never told Jarvis? Doesn't matter. It already knows.

**The hardcoded fast path covers:**

| You say... | Jarvis uses... | Why |
|---|---|---|
| Something is broken / error / crash | `systematic-debugging` (Superpowers) | 4-phase root cause. No random fixes. |
| I need to investigate / trace something | `investigate` (gstack) | Deep diagnosis with logs |
| Build something new, scope unclear | `brainstorm` → full Superpowers pipeline | Design spec before code. Prevents rework. |
| Build something quick and obvious | `gsd-quick` | No ceremony. Just do it. |
| Plan a feature or architecture | `brainstorm` | Think before typing |
| Add / plan / run a phase | GSD phase skills | Tracked, resumable, stateful |
| Run everything automatically | `gsd-autonomous` | Walk away. Come back to shipped code. |
| Write tests | `test-driven-development` (Superpowers) | RED before GREEN. Iron law. |
| Ship / PR / push | `ship` (gstack) | Tests → review → bump → PR |
| Code review | `review` (gstack) | Diff review before merge |
| Is this actually done? | `verification-before-completion` (Superpowers) | Evidence before claims |
| Where are we in the project? | `gsd-progress` | Full milestone status |
| Test the UI / browse a URL | `browse` / `qa` (gstack) | Headless browser QA |
| Code quality check | `health` (gstack) | Lint, types, dead code |

**How it decides when two skills could match:**
1. Something is broken → fix first, always
2. Scope is unclear → design before coding
3. Active `.planning/` directory → GSD (stateful)
4. No project structure → Superpowers (lightweight)
5. Task is simple and obvious → `gsd-quick`, no overhead

---

## For the 10x Lazier Developer

Look. You installed this because you're lazy. I respect that. We're the same.

But I want you to understand the full magnitude of what you've done. You now have:

- **GSD** — a project orchestration system that manages your entire roadmap, tracks every decision, runs phases in parallel, and remembers everything between sessions. Built by people who think "good enough" is a character flaw.
- **Superpowers** — an engineering discipline framework that enforces TDD, catches bugs before they compound, runs two-stage code reviews after every task, and physically blocks you from claiming something is done without proof. Built by people who apparently have never cut a corner in their life.
- **gstack** — a full browser automation, QA, shipping, and monitoring toolkit. Built by people who automate things other people don't even realize can be automated.

Three of the most powerful AI developer frameworks in existence.

And you interact with all of them by typing what you want like you're texting a friend.

You are now a 10x developer. Not because you work harder. Because you were too lazy to work harder and just automated the thinking part.

This is peak laziness. I'm proud of us.

---

## Built with Synapse

Jarvis was built while working on **[Synapse-OSS](https://github.com/UpayanGhosh/Synapse-OSS)** — an open-source AI personal assistant that evolves with you. Every instance becomes a unique, self-evolving architecture shaped entirely by the person it serves. Persistent memory, hybrid RAG, soul-brain sync, knowledge graph, multi-channel (WhatsApp, Telegram, Discord). The kind of AI assistant that actually knows you.

If you like the vibe of Jarvis, you'll like Synapse. Go check it out.

---

## Requirements

Just Claude Code. The install script handles GSD, gstack, and Superpowers automatically.

If something didn't install, manually:
- **GSD**: `npm install -g get-shit-done`
- **gstack**: `git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup`
- **Superpowers**: `claude plugin marketplace add obra/superpowers` then `claude plugin install superpowers@superpowers-dev`

---

## Contributing

Found a routing case that Jarvis handles wrong? Open an issue or a PR. Describe the intent you typed and which skill it should have picked.

Please don't open issues saying "can you add support for X skill." Yes I can. I am, in fact, not lazy when it comes to this specific project because it directly enables my laziness everywhere else. It's a net positive.

---

## License

MIT. Do whatever. I'm not going to read the PR anyway — Jarvis will review it.
