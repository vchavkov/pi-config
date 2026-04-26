---
description: Manually run git sync — commit, pull, push brain repo and all submodules
---
Run a full manual git sync:

1. Run `bash ~/.config/brain/scripts/git/git-sync.sh` and show the output
2. If the brain repo has diverged (push rejected or rebase conflict):
   - Run `git -C ~/.config/brain fetch origin`
   - Hard-reset: `git -C ~/.config/brain reset --hard origin/main`
   - Commit any modified submodule pointers: `git -C ~/.config/brain add .agents/ && git -c commit.gpgsign=false -C ~/.config/brain commit -m "auto: sync submodule pointers $(date '+%Y-%m-%d %H:%M')" || true`
   - Push: `git -C ~/.config/brain push origin main`
3. Run `bash ~/.config/brain/scripts/git/git-submodule-sync.sh` and show the output
4. Commit and push any updated submodule pointers from step 3
5. Restore any dirty read-only submodules: `git -C ~/.config/brain submodule foreach 'git checkout . 2>/dev/null || true'`
6. Show final status: `git -C ~/.config/brain status --short`
