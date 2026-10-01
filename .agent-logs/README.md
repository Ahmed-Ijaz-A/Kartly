# Agent logs

Automatic capture of every prompt and final response for this repo.
Written by `.claude/hooks/capture-agent-log.mjs` via the `UserPromptSubmit`
and `Stop` hooks in `.claude/settings.json`.

- `*.md` — one file per session, in the submission format. This is the
  deliverable, and the only thing committed here.

These files are committed on purpose. Do not edit or tidy them.
