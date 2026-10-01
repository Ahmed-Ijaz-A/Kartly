# Agent logs

Automatic capture of every prompt and final response for this repo.
Written by `.claude/hooks/capture-agent-log.mjs` via the `UserPromptSubmit`
and `Stop` hooks in `.claude/settings.json`.

- `*.md` — one file per session, in the submission format.
- `raw/*.jsonl` — append-only mirror of the same entries.

These files are committed on purpose. Do not edit or tidy them.
