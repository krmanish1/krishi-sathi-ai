# Agent progress log (system-of-record)

This file is the *cross-session memory* for coding agents. It should be updated at the end of meaningful work so the next session can resume without re-deriving context.

## How to use

- Before starting work:
  - Read `AGENTS.md` and `CLAUDE.md`
  - Run `./init.sh` (or equivalent) to verify the environment
  - Read `feature_list.json` and pick **exactly one** unfinished feature/task
- Before claiming done:
  - Ensure `npm run lint`, `npm run typecheck`, and `npm test` pass
  - If web-impacting, also run `npx expo export -p web --output-dir ./dist/web-verify`
    - Windows PowerShell example: `npx expo export -p web --output-dir .\dist\web-verify`
- End of session:
  - Write a short entry here: what changed + evidence (commands + results) + what's next
  - Update `feature_list.json` if a feature status meaningfully changed

---

## 2026-05-06 — Harness baseline added

- **Change**: Added minimal harness state files: `feature_list.json` and this progress log. Added `init.sh` to standardize verification.
- **Verification**: On Windows PowerShell, use `./init.ps1` (Git Bash/WSL can use `./init.sh`).
- **Next**: Use `feature_list.json` to select one feature/task at a time and record progress here after each session.

