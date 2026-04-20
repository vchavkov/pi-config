# Pi Config

Personal [pi](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent) configuration — agents, skills, extensions, and prompts that shape how pi works.

This is a fork of [HazAT/pi-config](https://github.com/HazAT/pi-config). The original repo is tracked as `upstream` for easy syncing.

---

## Quick Start — Fresh Machine

### Option A: Standalone clone

```bash
mkdir -p ~/.pi
git clone git@github.com:vchavkov82/pi-config ~/.pi/agent
cd ~/.pi/agent && ./setup.sh
```

### Option B: Via [brain](https://github.com/vchavkov82/brain) repo (recommended)

pi-config is tracked as a git submodule at `.agents/pi-config`. On a new machine:

```bash
git clone --recurse-submodules git@github.com:vchavkov82/brain ~/.config/brain
brain setup   # symlinks ~/.pi/agent -> .agents/pi-config
cd ~/.pi/agent && ./setup.sh
```

### What `setup.sh` does

1. Checks that `pi` is installed (fails with a hint if missing)
2. Seeds a default `settings.json` if none exists
3. Installs all pi packages (subagents, extensions, tools)
4. Installs extension npm dependencies
5. Warns if `auth.json` is missing

### Add your API keys

Create `~/.pi/agent/auth.json`:

```json
{
  "anthropic": "sk-ant-...",
  "openai-codex": {
    "type": "oauth",
    "access": "...",
    "refresh": "...",
    "expires": 0
  }
}
```

Built-in API-key providers still read from `auth.json`, but the checked-in Bosch/SAP Vertex Anthropic providers are registered by `extensions/vertex-anthropic-providers/index.mjs` and read their base URLs plus tokens from environment variables instead.

Supported environment variables:

- Bosch (legacy/current): `BOSCH_ANTHROPIC_BASE_URL` or `BOSCH_ANTHROPIC_VERTEX_BASE_URL`, plus `BOSCH_ANTHROPIC_AUTH_TOKEN` or `BOSCH_ANTHROPIC_API_KEY`
- Bosch fallback for older shells: `ANTHROPIC_VERTEX_BASE_URL`, plus `ANTHROPIC_AUTH_TOKEN` or `ANTHROPIC_API_KEY`
- SAP: `SAP_ANTHROPIC_BASE_URL` or `SAP_ANTHROPIC_VERTEX_BASE_URL`, plus `SAP_ANTHROPIC_AUTH_TOKEN` or `SAP_ANTHROPIC_API_KEY`

Those providers expose these scoped models:

- `bosch-anthropic/claude-haiku-4-5`
- `bosch-anthropic/claude-sonnet-4-6`
- `bosch-anthropic/claude-opus-4-6`
- `sap-anthropic/claude-haiku-4-5`
- `sap-anthropic/claude-sonnet-4-6`
- `sap-anthropic/claude-opus-4-6`

`auth.json` is gitignored and will not be committed.

### Restart pi

Pick up all config changes by restarting pi.

---

## Updating Your Local Config

```bash
cd ~/.pi/agent && git pull
```

---

## Syncing from Upstream

This fork tracks [HazAT/pi-config](https://github.com/HazAT/pi-config) as `upstream`. To pull in upstream changes:

```bash
# One-time: add upstream remote if not already set
git remote add upstream git@github.com:HazAT/pi-config.git

git fetch upstream
git checkout main
git merge upstream/main
```

Resolve any conflicts, then push to your fork:

```bash
git push origin main
```

---

## Architecture

This config uses **subagents** — visible pi sessions spawned in cmux terminals. Each subagent is a full pi session with its own identity, tools, and skills. The user can watch agents work in real-time and interact when needed.

### Key Concepts

- **Subagents** — visible cmux terminals running pi. Autonomous agents self-terminate via `subagent_done`. Interactive agents wait for the user.
- **Agent definitions** (`agents/*.md`) — one source of truth for model, tools, skills, and identity per role.
- **Plan workflow** — `/plan` spawns an interactive planner subagent, then orchestrates workers and reviewers.
- **Iterate pattern** — `/iterate` forks the session into a subagent for quick fixes without polluting the main context.

---

## Agents

Specialized roles with baked-in identity, workflow, and review rubrics. Most agents ship with the [pi-interactive-subagents](https://github.com/HazAT/pi-interactive-subagents) package; local overrides live in `agents/`.

| Agent | Source | Purpose |
|-------|--------|---------|
| **spec** | package | Interactive spec agent — clarifies WHAT to build (intent, requirements, ISC) |
| **planner** | package | Interactive planning — takes a spec and figures out HOW to build it |
| **scout** | package | Fast codebase reconnaissance — gathers context without making changes |
| **worker** | package | Implements tasks from todos, commits with polished messages |
| **reviewer** | package | Reviews code for quality, security, correctness |
| **visual-tester** | package | Visual QA — navigates web UIs via Chrome CDP, spots issues, produces reports |
| **claude-code** | package | Delegates autonomous tasks to Claude Code |
| **researcher** | local | Deep research using parallel.ai tools + Claude Code for code analysis |
| **autoresearch** | local | Autonomous experiment loop — runs, measures, and optimizes iteratively |

---

## Skills

Loaded on-demand when the context matches.

| Skill | When to Load |
|-------|-------------|
| **commit** | Making git commits (mandatory for every commit) |
| **code-simplifier** | Simplifying or cleaning up code |
| **frontend-design** | Building web components, pages, or apps |
| **github** | Working with GitHub via `gh` CLI |
| **iterate-pr** | Iterating on a PR until CI passes |
| **learn-codebase** | Onboarding to a new project, checking conventions |
| **session-reader** | Reading and analyzing pi session JSONL files |
| **skill-creator** | Scaffolding new agent skills |
| **write-todos** | Writing clear, actionable todos from a plan |
| **self-improve** | End-of-session retrospective — surfaces improvements and creates todos |
| **cmux** | Managing terminal sessions via cmux |
| **presentation-creator** | Creating data-driven presentation slides |
| **add-mcp-server** | Adding MCP server configurations |

---

## Extensions

| Extension | What it provides |
|-----------|------------------|
| **answer/** | `/answer` command + `Ctrl+.` — extracts questions into interactive Q&A UI |
| **cmux/** | cmux integration — notifications, sidebar, workspace tools |
| **cost/** | `/cost` command — API cost summary |
| **execute-command/** | `execute_command` tool — lets the agent self-invoke slash commands |
| **todos/** | `/todos` command + `todo` tool — file-based todo management |

---

## Commands

| Command | Description |
|---------|-------------|
| `/plan <description>` | Start a planning session — spawns planner subagent, then orchestrates execution |
| `/subagent <agent> <task>` | Spawn a subagent (e.g., `/subagent scout analyze the auth module`) |
| `/iterate [task]` | Fork session into interactive subagent for quick fixes |
| `/answer` | Extract questions into interactive Q&A |
| `/todos` | Visual todo manager |
| `/cost` | API cost summary |

---

## Packages

Installed via `pi install`, managed in `settings.json`. In this repo, external Pi packages are checked in as git submodules under `.agents/_pi/packages/` and loaded via local relative paths from `~/.pi/agent/settings.json`.

| Package | Description |
|---------|-------------|
| `../_pi/packages/pi-interactive-subagents` | Submodule for subagent tools + agent definitions + `/plan`, `/subagent`, `/iterate` commands |
| `../_pi/packages/pi-parallel` | Submodule for parallel web search, extract, research, and enrich tools |
| `../_pi/packages/pi-smart-sessions` | Submodule for AI-generated session names |
| `../_pi/packages/pi-diff-review` | Submodule for interactive diff review UI |
| `../_pi/packages/chrome-cdp-skill` | Submodule for Chrome DevTools Protocol CLI visual testing |
| `../_pi/packages/pi-mcp-adapter` | Submodule for MCP adapter integration |
| `../_pi/packages/glimpse` | Submodule for Glimpse UI support |
| `../_pi/packages/pi-autoresearch` | Submodule for autoresearch workflows |

---

## Troubleshooting

### "There's an issue with the selected model"

```
There's an issue with the selected model (claude-sonnet-latest). It may not exist or
you may not have access to it. Run /model to pick a different model.
```

**What this means:**

The default model configured in `settings.json` (e.g. `claude-sonnet-latest` or `claude-opus-4-6`) is either:

- Not available under your current API credentials or subscription tier
- Temporarily unavailable from the provider
- A model alias that has been deprecated or renamed

**How to fix:**

1. Run `/model` inside pi to open the model picker
2. Select any model shown as available
3. Optionally update `defaultModel` in `~/.pi/agent/settings.json` to a model you have confirmed access to
4. If Anthropic models still fail, verify the local proxy at `http://localhost:6655/anthropic` is running

**Notes:**

- Access to specific Claude models depends on your Anthropic API key and the local Anthropic-compatible proxy configuration
- If using another provider (OpenAI Codex, etc.), make sure the matching credentials are present in `auth.json`
- If you have access to multiple providers, switching provider via `/model` may resolve the issue without changing auth

---

## Credits

Original config by [HazAT](https://github.com/HazAT/pi-config).

Extensions from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff): `answer`, `todos`

Skills from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff): `commit`, `github`

Skills from [getsentry/skills](https://github.com/getsentry/skills): `code-simplifier`
