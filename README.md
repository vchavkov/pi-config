# Pi Config

My personal [pi](https://github.com/badlogic/pi) configuration — agents, skills, extensions, and prompts that shape how pi works for me.

## Setup

Clone this repo directly to `~/.pi/agent/` — pi auto-discovers everything from there (extensions, skills, agents, AGENTS.md, mcp.json). No symlinks, no manual wiring.

### Fresh machine

```bash
# 1. Install pi (https://github.com/badlogic/pi)

# 2. Clone this repo as your agent config
mkdir -p ~/.pi
git clone git@github.com:HazAT/pi-config ~/.pi/agent

# 3. Run setup (installs packages + extension deps)
cd ~/.pi/agent && ./setup.sh

# 4. Add your API keys to ~/.pi/agent/auth.json

# 5. Restart pi
```

### Updating

```bash
cd ~/.pi/agent && git pull
```

---

## Architecture

This config uses **panel agents** — visible pi sessions spawned in [cmux](https://github.com/nicobailon/cmux) terminal panels. Each panel agent is a full pi session with its own identity, tools, and skills. The user can watch agents work in real-time and interact when needed.


### Key Concepts

- **Panel agents** — visible cmux panels running pi. Autonomous agents self-terminate via `panel_done`. Interactive agents wait for the user.
- **Agent definitions** (`agents/*.md`) — one source of truth for model, tools, skills, and identity per role.
- **Plan workflow** — `/plan` spawns an interactive planner panel, then orchestrates workers and reviewers.
- **Iterate pattern** — `/iterate` forks the session into a panel for quick fixes without polluting the main context.

---

## Agents

Specialized roles with baked-in identity, workflow, and review rubrics.

| Agent | Model | Purpose |
|-------|-------|---------|
| **planner** | Opus 4.6 | Interactive brainstorming — clarify, explore, validate design, write plan, create todos |
| **scout** | Haiku 4.5 | Fast codebase reconnaissance — gathers context without making changes |
| **worker** | Sonnet 4.6 | Implements tasks from todos, commits with polished messages |
| **reviewer** | Opus 4.6 | Reviews code for quality, security, correctness (review rubric baked in) |
| **researcher** | Sonnet 4.6 | Deep research using parallel.ai tools + Claude Code for code analysis |
| **visual-tester** | Sonnet 4.6 | Visual QA — navigates web UIs via Chrome CDP, spots issues, produces reports |

## Skills

Loaded on-demand when the context matches.

| Skill | When to Load |
|-------|-------------|
| **plan** | Planning a feature — orchestrates planner panel → workers → reviewer |
| **commit** | Making git commits (mandatory for every commit) |
| **code-simplifier** | Simplifying or cleaning up code |
| **frontend-design** | Building web components, pages, or apps |
| **github** | Working with GitHub via `gh` CLI |
| **learn-codebase** | Onboarding to a new project, checking conventions |
| **session-reader** | Reading and analyzing pi session JSONL files |
| **skill-creator** | Scaffolding new agent skills |
| **cmux** | Managing terminal sessions via cmux |
| **presentation-creator** | Creating data-driven presentation slides |
| **add-mcp-server** | Adding MCP server configurations |

## Extensions

| Extension | What it provides |
|-----------|------------------|
| **panel-agents/** | `panel_agent` tool + `/plan`, `/panel`, `/iterate` commands — spawns agents in cmux panels |
| **answer.ts** | `/answer` command + `Ctrl+.` — extracts questions into interactive Q&A UI |
| **claude-tool/** | `claude` tool — invoke Claude Code for autonomous tasks |
| **execute-command.ts** | `execute_command` tool — lets the agent self-invoke slash commands |
| **session-artifacts.ts** | `write_artifact` tool — session-scoped artifact storage |
| **todos.ts** | `/todos` command + `todo` tool — file-based todo management |
| **cost.ts** | `/cost` command — API cost summary |
| **cmux/** | cmux integration — notifications, sidebar, workspace tools |
| **ghostty.ts** | Ghostty terminal title + progress bar integration |
| **watchdog.ts** | Monitors agent behavior |

## Commands

| Command | Description |
|---------|-------------|
| `/plan <description>` | Start a planning session — spawns planner panel, then orchestrates execution |
| `/panel <agent> <task>` | Spawn any agent as a panel (e.g., `/panel scout analyze the auth module`) |
| `/iterate [task]` | Fork session into interactive panel for quick fixes |
| `/answer` | Extract questions into interactive Q&A |
| `/todos` | Visual todo manager |
| `/cost` | API cost summary |

## Packages

Installed via `pi install`, managed in `settings.json`.

| Package | Description |
|---------|-------------|
| [pi-parallel](https://github.com/HazAT/pi-parallel) | Parallel web search, extract, research, and enrich tools |
| [pi-smart-sessions](https://github.com/HazAT/pi-smart-sessions) | AI-generated session names |
| [glimpse](https://github.com/HazAT/glimpse) | Native macOS UI — dialogs, forms, visualizations |
| [chrome-cdp-skill](https://github.com/pasky/chrome-cdp-skill) | Chrome DevTools Protocol CLI for visual testing |

---

## Credits

Extensions from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff): `answer.ts`, `todos.ts`

Skills from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff): `commit`, `github`

Skills from [getsentry/skills](https://github.com/getsentry/skills): `code-simplifier`
