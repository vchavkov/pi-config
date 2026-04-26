---
description: Restore and verify git auto-commit, auto-sync, and submodule sync timers
---
Restore and verify the full git automation stack:

1. Check timer status: `systemctl --user list-timers`
2. For each of `git-sync.timer` and `git-submodule-sync.timer`:
   - If not enabled: `systemctl --user enable <timer>`
   - If not active: `systemctl --user start <timer>`
3. Verify the service unit files exist and are linked:
   - `systemctl --user status git-sync.service git-sync.timer`
   - `systemctl --user status git-submodule-sync.service git-submodule-sync.timer`
4. If unit files are missing, re-link them from brain:
   ```
   systemctl --user link ~/.config/brain/scripts/systemd/git-sync.service
   systemctl --user link ~/.config/brain/scripts/systemd/git-sync.timer
   systemctl --user link ~/.config/brain/scripts/systemd/git-submodule-sync.service
   systemctl --user link ~/.config/brain/scripts/systemd/git-submodule-sync.timer
   systemctl --user daemon-reload
   systemctl --user enable --now git-sync.timer git-submodule-sync.timer
   ```
5. Confirm `auto-commit-repos.txt` lists the brain repo:
   `cat ~/.config/brain/scripts/git/auto-commit-repos.txt`
6. Run one manual sync to verify everything works: trigger `/git-sync`
7. Show final timer status
