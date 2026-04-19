# Task Brief Template

Use this template when writing `.tasks/TASK.md` inside a worktree.
Replace every `<placeholder>` with real content. Do not leave any section empty.

---

```markdown
# Task: <title>

STATUS:
<!-- Worker writes: STATUS: complete   — when done -->
<!-- Worker writes: STATUS: blocked    — when stuck with no path forward -->

## Context

<Why this task exists. What problem it solves. What the user will experience when it's done.>

## Requirements

1. <Specific, testable action — what must be implemented or changed>
2. <Another requirement>
3. <...>

## Files to Modify

- `path/to/file.ts`
- `path/to/other.ts`
<!-- List every file the worker should touch. No globs. No "and related files". -->

## Design Reference

<!-- Optional. Include only when visual or structural consistency matters. -->
<!-- - Match spacing in `packages/ui/src/card.tsx` -->
<!-- - Use `text-sm text-muted-foreground` for secondary text -->
<!-- - Follow the pattern in `src/components/Button.tsx` -->

## API Contract

<!-- Optional. Show relevant request/response shapes when the worker needs to call or implement an API. -->
<!-- GET /api/users/:id → { id, name, email } -->

## Acceptance Criteria

- [ ] <Specific, independently verifiable condition>
- [ ] <Another condition>
- [ ] <...>
<!-- Each item must be checkable without running the full app — prefer unit-testable assertions. -->

## Questions

<!-- Worker adds lines here if blocked: -->
<!-- QUESTION: <text> -->
<!-- Orchestrator responds immediately below: -->
<!-- ANSWER: <text> -->

## Notes

<!-- Scope limits and explicit non-goals. -->
<!-- - Do NOT change the public API surface -->
<!-- - Do NOT modify unrelated files -->
<!-- - No new dependencies without approval -->
```
