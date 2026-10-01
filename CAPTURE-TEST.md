# Capture test

Verification that every prompt and final response in this repo is captured
automatically, per step 4 of the setup.

## Tool and model

- **Tool:** Claude Code (VS Code extension, Windows 11)
- **Model:** `claude-opus-5` (Opus 5)
- **Author:** Ahmed-Ijaz-A

## Mechanism and config file

Capture is a pair of repo-level hooks, so it applies to **every** session
opened in this directory — nothing session-scoped, nothing to remember to
switch on.

- **Config file:** `.claude/settings.json`
- **Hook script:** `.claude/hooks/capture-agent-log.mjs`

| Hook event | Mode | What it records |
| --- | --- | --- |
| `UserPromptSubmit` | `prompt` | The verbatim prompt text |
| `Stop` | `response` | The final assistant message only |

The `Stop` payload supplies `last_assistant_message` directly, which is
authoritative; the script's own transcript walk is only a fallback. Thinking,
tool calls and mid-turn assistant messages are deliberately excluded.

## Log path

`.agent-logs/<UTC timestamp>_<session id>.md` — one file per session, appended
to in place, with YAML frontmatter plus `[LOG_ENTRY ...]` blocks.

Committed so far:

- `.agent-logs/2026-10-01_19-33-29_b8934ff6-ea8a-4bda-a8ef-f143145989d6.md`
- `.agent-logs/2026-10-01_19-35-34_3aa6c92a-986e-4aab-8eda-0fcf84a6bad9.md`

## Canary 1 — session `b8934ff6`

Pasted raw from the log file.

```
[LOG_ENTRY type=PROMPT num=1 session=b8934ff6]
timestamp: 2026-10-01T19:33:29.317Z
model: claude-opus-5

CAPTURE TEST — 8x assignment, Ahmed Ijaz
```

## Canary 2 — session `3aa6c92a`

A genuinely separate session (new window, new session id), confirming the hooks
are repo-level and not tied to the session that installed them. Pasted raw from
the log file.

```
[LOG_ENTRY type=PROMPT num=1 session=3aa6c92a]
timestamp: 2026-10-01T19:35:34.030Z
model: unknown

<ide_opened_file>The user opened the file c:\dev\Kartly store\Kartly\README.md in the IDE. This may or may not be related to the current task.</ide_opened_file>
CAPTURE TEST 2 — 8x assignment, Ahmed Ijaz, second session


[LOG_ENTRY type=RESPONSE num=1 session=3aa6c92a]
timestamp: 2026-10-01T19:35:38.135Z
model: claude-opus-5

Noted — capture test 2, 8x assignment, Ahmed Ijaz, second session. No action needed; standing by for the actual task.
```

The `model: unknown` above is left exactly as recorded — see "Model recorded as
unknown" below. Earlier logs are never rewritten.

## Canary 3 — session `3aa6c92a`, after the model fix

Same session as canary 2, sent once the model fix was in place. This is the
confirmation that a prompt now records the real model id rather than
`unknown`. Pasted raw from the log file.

```
[LOG_ENTRY type=PROMPT num=3 session=3aa6c92a]
timestamp: 2026-10-01T19:50:12.454Z
model: claude-opus-5

<ide_opened_file>The user opened the file c:\dev\Kartly store\Kartly\CAPTURE-TEST.md in the IDE. This may or may not be related to the current task.</ide_opened_file>
CAPTURE TEST 3 — 8x assignment, Ahmed Ijaz, second session
```

## What failed first

### 1. Git Bash heredoc writing the hook script

The first attempt wrote `capture-agent-log.mjs` through a `cat > file <<'EOF'`
heredoc in the Bash tool. It mangled the file: the script is full of backticks,
`${...}` template literals and `$0`-style tokens, and the combination of Git
Bash on Windows and CRLF handling corrupted the template strings, so Node
failed to parse it. Writing the file with the dedicated file-write tool
instead, and keeping heredocs for plain prose only, fixed it. (This document
is prose, so a heredoc is fine here.)

### 2. Mid-session hook installation — my prediction was wrong

I stated that hooks added to `.claude/settings.json` mid-session would not take
effect until the session restarted, and that the canary would therefore need a
fresh window. That was wrong: `UserPromptSubmit` fired on the very next prompt
of the same session, with no restart. The snapshot concern did not apply. I
recorded the correction rather than quietly dropping it.

### 3. A `Stop` with no matching prompt

`Stop` also fired once for the turn that ran *before* the hooks existed
(19:29:57). It correctly wrote nothing, because the script pairs one response
per recorded prompt and there was no prompt entry to pair with.

**Consequence, stated rather than patched:** the original assignment-brief
prompt predates capture and is therefore absent from the logs. It was not
backfilled — writing an entry after the fact would defeat the point of the
exercise.

### 4. Model recorded as `unknown`

The first prompt of each session logged `model: unknown`. Cause: the hook
payload carries no `model` field at all (confirmed against real payload dumps —
`UserPromptSubmit` provides `session_id`, `transcript_path`, `cwd`,
`prompt_id`, `permission_mode`, `hook_event_name`, `prompt`, and nothing more),
and on a session's *first* prompt the transcript contains no assistant entry to
read a model name from yet. So there was genuinely nothing to resolve.

Fix, in `.claude/hooks/capture-agent-log.mjs`:

- The first prompt of a session is written as `model: pending`, and that same
  turn's `Stop` hook backfills the real model name once it is known. A
  cross-session guess was considered and rejected — it would have labelled the
  prompt with a *different* session's model.
- `pending` is used as the sentinel precisely because it appears nowhere in the
  logs written before the fix, so backfill can never rewrite an existing
  entry. The `unknown` values already on disk are left untouched, as above.
- Every subsequent prompt and every response resolves the model from the
  session's own transcript, with a sibling-transcript lookup as a last resort
  for responses only.

Verified in a sandbox: a fresh session's first prompt records `pending`, the
`Stop` of that same turn rewrites it and the response entry to the real model
id, and following turns record the real id directly. No `unknown` remains
reachable.

### 5. Backfill was an unanchored string replace

The first version of the model backfill replaced every occurrence of the
substring `model: pending` in the log body. That is unsafe: the logged text
itself quotes that string in prose — this session's own log contains the line
"First prompt now writes `model: pending`, and that same turn's `Stop` hook
backfills the real name" — and a substring replace would have rewritten
conversation content, not just an entry header.

Caught by grepping the logs for leftover sentinels and noticing the hits were
prose, not headers. The replace is now anchored to a whole line
(`^model: pending$`, multiline), so it can only ever touch an entry's `model:`
header.

In practice the sentinel is also only ever present on a session's first turn,
and is resolved by that turn's `Stop` before any response prose exists — so the
unanchored version had not actually corrupted anything. It was fixed as a
latent defect, not a live one.

## Debug artefacts, now off and not committed

Two things were written during bring-up that are **not** part of the
deliverable:

| Path | What it was | Status |
| --- | --- | --- |
| `.agent-logs/.hook-payloads.debug.jsonl` | Raw dump of every hook payload, used to discover that no `model` field is sent | Writing code removed; `AGENT_LOG_DEBUG` dropped from `.claude/settings.json`; untracked and gitignored |
| `.agent-logs/raw/*.jsonl` | Append-only JSONL mirror of the same entries already in the `.md` logs | Writing code removed; redundant duplicate; untracked and gitignored |

Both are listed in `.gitignore`. The committed deliverable under
`.agent-logs/` is the per-session `*.md` logs and this repo's `README.md` only.
