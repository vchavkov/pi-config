---
name: worktree-dispatch
description: Full git worktree lifecycle for Cursor agent task dispatch. Creates a worktree and task branch, writes the task brief, launches cursor-agent via cmux, monitors for questions and auto-answers them, then verifies, merges, and cleans up on completion. Use when "dispatch to cursor", "cursor worktree", "run this in cursor", "create worktree for task", "checkout worktree", "dispatch task to agent", "send to cursor agent", or "open in cursor". Requires pi + cmux environment.
---

# Worktree Dispatch

Manages the full lifecycle of a cursor-agent task in an isolated git worktree:

**create worktree → write brief → launch worker → answer questions → verify → merge → clean up**

Use `cursor-dispatch` instead when the worktree already exists.

## When NOT to Use

- Single-file fixes or tasks under ~30 minutes of work
- No written task spec or clear requirements
- Outside a git repository
- cmux not available (`CMUX_SOCKET_PATH` not set)

---

## Configuration

Read `.worktree-dispatch.yml` from the project root if it exists:

```yaml
# .worktree-dispatch.yml
worktrees_dir: .worktrees    # directory for git worktrees (default: .worktrees)
branch_prefix: cursor/       # task branch prefix (default: cursor/)
verify_cmd: mise run test    # verification command run inside worktree
auto_merge: true             # false = pause before merge for explicit approval
agent: cursor                # cursor | codex | pi
```

Per-invocation overrides accepted as natural language: "skip verify", "no auto merge", "use codex".

---

## Pre-flight Checks

Before creating the worktree:

1. Run `git status` — must be clean on main. Stash or commit any pending changes.
2. Check `.gitignore` — add `.worktrees/` if missing, then commit.
3. Confirm `cursor/<slug>` branch does not already exist (`git branch --list cursor/<slug>`).

---

## Phase 1: Setup

Derive a **slug** from the task title: lowercase, hyphens only, ≤40 chars.
Example: "Add user profile page" → `add-user-profile-page`

```bash
# From the repo root:
git worktree add .worktrees/<slug> -b cursor/<slug>
```

Resulting structure:

```
<repo-root>/
├── .worktrees/
│   └── <slug>/               ← isolated worktree on cursor/<slug>
│       ├── .tasks/
│       │   └── TASK.md       ← task brief (written in Phase 2)
│       └── .cursor/
│           └── rules/
│               └── task.mdc  ← always-apply cursor rule (written in Phase 2)
└── .gitignore                ← must include .worktrees/
```

---

## Phase 2: Brief

Read `${CLAUDE_SKILL_ROOT}/references/task-brief-template.md` for the TASK.md template.

Write `.tasks/TASK.md` inside the worktree. Fill in every section:

- **Title** and **Context** — from the task description and surrounding codebase context
- **Requirements** — numbered, specific, testable; one action per item
- **Files to Modify** — explicit paths, no globs; list every file the worker should touch
- **Acceptance Criteria** — unchecked `[ ]` boxes, each independently verifiable
- **Notes** — scope limits and explicit non-goals
- Leave **Questions** empty and omit the `STATUS:` line initially

Write `.cursor/rules/task.mdc` inside the worktree:

```markdown
---
description: "Active task instructions"
alwaysApply: true
---

Read `.tasks/TASK.md` for the full task specification and implement it completely.

Constraints:
- Only modify files listed under "Files to Modify"
- Run the project's verify command before committing
- Commit with: `feat: <task title>`
- Write `STATUS: complete` at the top of TASK.md when done
- Write `QUESTION: <text>` in the Questions section if blocked — the orchestrator will answer
```

If the project already has `.cursor/rules/` files on main, copy them into `.worktrees/<slug>/.cursor/rules/` alongside `task.mdc` (copy, not symlink — branches must be self-contained).

---

## Phase 3: Launch

Open a cmux surface and start cursor-agent inside the worktree:

```bash
SURFACE=$(cmux new-surface --type terminal | awk '{print $2}')
sleep 0.5

WORKTREE_PATH="$(git rev-parse --show-toplevel)/.worktrees/<slug>"
cmux send --surface $SURFACE "cd $WORKTREE_PATH && cursor-agent -p 'Read .tasks/TASK.md and implement it. Write STATUS: complete when done.' --force\n"
```

Verify startup within 15 seconds:

```bash
for i in $(seq 1 15); do
  OUT=$(cmux read-screen --surface $SURFACE --lines 30)
  echo "$OUT" | grep -qi "reading\|task\|implement" && { echo "Worker started"; break; }
  sleep 1
done
```

Record `$SURFACE` — needed for monitoring, nudging, and cleanup.

---

## Phase 4: Monitor

Poll every 30 seconds. Read the task brief directly from the worktree file.

```bash
TASK_FILE=".worktrees/<slug>/.tasks/TASK.md"

while true; do
  TASK=$(cat "$TASK_FILE")

  # Completion check
  echo "$TASK" | grep -q "^STATUS: complete" && break
  echo "$TASK" | grep -q "^STATUS: blocked"  && { escalate_to_user; break; }

  # Question check — handled below
  sleep 30
done
```

### Answering Questions

A `QUESTION:` line is **unanswered** if the line immediately following it is not `ANSWER:`.

For each unanswered question:

1. Read the full TASK.md, the referenced files, and relevant codebase context
2. Formulate a concrete answer — no hedging, no "it depends"
3. Edit TASK.md: insert `ANSWER: <text>` on the line immediately after the `QUESTION:` line
4. Nudge cursor-agent to re-read by sending a newline to the surface:
   ```bash
   cmux send --surface $SURFACE "\n"
   ```

### Timeout

If no `STATUS:` marker appears within 30 minutes and no new `QUESTION:` lines have appeared, read the surface for errors:

```bash
cmux read-screen --surface $SURFACE --lines 50 --scrollback
```

Show the output to the user and wait for direction.

---

## Phase 5: Verify

Run inside the worktree, **not** the repo root:

```bash
cd .worktrees/<slug>
<verify_cmd>    # e.g.: mise run test && mise run lint
```

If verification fails:

- **Fixable** (formatting, lint): fix in the worktree and re-verify
- **Test failure**: append a `## Failure` section to TASK.md with the full failure output, resume monitoring so cursor-agent can fix it
- After 3 failed verify cycles: show the failure to the user and do not merge

Do not proceed to Phase 6 until verification is clean.

---

## Phase 6: Merge

From the repo root:

```bash
git checkout main
git pull origin main
git merge cursor/<slug> --no-ff -m "Merge cursor/<slug>: <task title>"
```

**On conflict:** Stop immediately. Show the conflicting files and wait for user resolution. Do not auto-resolve.

If `auto_merge: false`: show the diff (`git diff main..cursor/<slug>`) and wait for explicit user approval before running the merge command.

Post-merge, re-run verify from the repo root to confirm nothing broke.

---

## Phase 7: Cleanup

Run this regardless of how the workflow ended — done, blocked, or error.

```bash
# Remove the worktree
git worktree remove .worktrees/<slug> --force

# Delete the task branch (only if merge succeeded)
git branch -d cursor/<slug>

# Close the cmux surface
cmux close-surface --surface $SURFACE
```

If the merge did not happen (blocked or error path), delete the branch **only after explicit user confirmation**.

---

## Error Handling

| Situation | Action |
|-----------|--------|
| cursor-agent fails to start | Read surface output, show error to user, run Phase 7 cleanup |
| `STATUS: blocked` with no QUESTION | Ask user for direction; treat as manual intervention required |
| Verify fails after 3 retries | Show failure output to user, do not merge, run Phase 7 cleanup |
| Merge conflict | Stop, show conflicting files, wait for user resolution, then continue |
| cmux surface dies unexpectedly | Re-launch cursor-agent in a new surface pointing to the same worktree |
| Worker diverges from main (rebase needed) | `cd .worktrees/<slug> && git rebase main`, then re-verify before merge |
