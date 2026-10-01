#!/usr/bin/env node
/**
 * 8x assignment capture hook.
 *
 * Invoked twice per turn by .claude/settings.json:
 *   UserPromptSubmit -> `prompt` mode  : records the verbatim prompt
 *   Stop             -> `response` mode: records the FINAL assistant text only
 *
 * Captures prompt + final response only. No thinking, no tool calls, no
 * intermediate assistant messages, no retries.
 *
 * Never throws out of main: a capture failure must not block the turn.
 */

import fs from "node:fs";
import path from "node:path";

const MODE = process.argv[2] === "response" ? "response" : "prompt";
const AUTHOR = "Ahmed-Ijaz-A";
const TOOL = "claude-code";
/**
 * Placeholder written when no model name is knowable yet -- only possible for
 * the first prompt of a session, before any assistant entry exists. The Stop
 * hook of that same turn backfills it. Never matches text in older logs, so
 * backfilling can never rewrite an already-correct entry.
 */
const PENDING = "pending";

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

/** Entries whose type is never conversation content are dropped here. */
function isConversation(o) {
  return (o.type === "user" || o.type === "assistant") && !o.isMeta && !o.isSidechain;
}

/** A real human prompt: user entry carrying text, not a tool_result envelope. */
function promptText(o) {
  if (o.type !== "user") return null;
  const c = o.message?.content;
  if (typeof c === "string") return c;
  if (!Array.isArray(c)) return null;
  if (c.some((b) => b.type === "tool_result")) return null;
  const text = c.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  return text.trim() ? text : null;
}

/**
 * The final response for the most recent turn.
 * Walks assistant entries after the last human prompt and keeps only the
 * trailing run of text blocks -- any tool_use resets the buffer, so anything
 * the model said mid-turn before acting is discarded.
 */
function finalResponse(lines) {
  const entries = [];
  for (const line of lines) {
    let o;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    if (isConversation(o)) entries.push(o);
  }

  let start = 0;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (promptText(entries[i]) !== null) {
      start = i + 1;
      break;
    }
  }

  let buffer = [];
  let model = null;
  for (const o of entries.slice(start)) {
    if (o.type !== "assistant") continue;
    const c = o.message?.content;
    if (!Array.isArray(c)) continue;
    if (c.some((b) => b.type === "tool_use")) {
      buffer = [];
      continue;
    }
    const text = c.filter((b) => b.type === "text").map((b) => b.text).join("\n");
    if (text.trim()) {
      buffer.push(text);
      model = o.message?.model ?? model;
    }
  }
  return { text: buffer.join("\n\n").trim(), model };
}

/** Most recent model seen in a set of transcript lines. */
function lastModel(lines) {
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const o = JSON.parse(lines[i]);
      if (o.type === "assistant" && o.message?.model) return o.message.model;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/**
 * Last-resort fallback for a response whose own transcript yielded nothing:
 * take the newest model recorded in any sibling transcript of the project.
 */
function lastModelFromSiblings(transcriptPath) {
  if (!transcriptPath) return null;
  try {
    const dir = path.dirname(transcriptPath);
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => path.join(dir, f))
      .map((f) => ({ f, m: fs.statSync(f).mtimeMs }))
      .sort((a, b) => b.m - a.m);
    for (const { f } of files) {
      const model = lastModel(readTranscript(f));
      if (model) return model;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function readTranscript(p) {
  if (!p) return [];
  try {
    return fs.readFileSync(p, "utf8").split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

/* ---------- log file ---------- */

function pad(n) {
  return String(n).padStart(2, "0");
}

function stamp(d) {
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `_${pad(d.getUTCHours())}-${pad(d.getUTCMinutes())}-${pad(d.getUTCSeconds())}`
  );
}

/** One file per session; find the existing one before minting a new name. */
function logPath(dir, sessionId, now) {
  fs.mkdirSync(dir, { recursive: true });
  const existing = fs.readdirSync(dir).filter((f) => f.endsWith(`_${sessionId}.md`));
  if (existing.length) return path.join(dir, existing.sort()[0]);
  return path.join(dir, `${stamp(now)}_${sessionId}.md`);
}

const FM_FIELDS = [
  "session_id",
  "date",
  "author",
  "model",
  "tool",
  "project",
  "total_exchanges",
  "first_prompt_time",
  "last_prompt_time",
];

function parseFile(file) {
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf8");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return { fm: {}, body: raw };
  const fm = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { fm, body: raw.slice(m[0].length) };
}

function render(fm, body) {
  const head = FM_FIELDS.filter((k) => fm[k] !== undefined)
    .map((k) => `${k}: ${fm[k]}`)
    .join("\n");
  return `---\n${head}\n---\n${body}`;
}

function entryBlock(type, num, shortId, iso, model, text) {
  return (
    `[LOG_ENTRY type=${type} num=${num} session=${shortId}]\n` +
    `timestamp: ${iso}\n` +
    `model: ${model}\n\n` +
    `${text}\n\n\n`
  );
}

function main() {
  let payload = {};
  try {
    payload = JSON.parse(readStdin());
  } catch {
    /* leave empty */
  }

  const sessionId = payload.session_id || "unknown-session";
  const shortId = sessionId.slice(0, 8);
  const projectDir = payload.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const dir = path.join(projectDir, ".agent-logs");
  const now = new Date();
  const iso = now.toISOString();

  const lines = readTranscript(payload.transcript_path);

  let text;
  let model;
  if (MODE === "prompt") {
    text = payload.prompt ?? "";
    if (!text.trim()) return;
    // Deliberately no cross-session guess here: on a session's first prompt
    // the true model is not yet knowable, so write the placeholder and let
    // this same turn's Stop hook backfill the real name.
    model = payload.model || lastModel(lines) || PENDING;
  } else {
    // The Stop payload hands us the final assistant message outright, which is
    // authoritative. finalResponse() is the fallback for payloads without it.
    const r = finalResponse(lines);
    text = (payload.last_assistant_message || r.text || "").trim();
    if (!text) return;
    // No model field in the hook payload (verified against a real dump), so
    // this has to come from the transcript, which by now definitely has one.
    model =
      r.model ||
      lastModel(lines) ||
      lastModelFromSiblings(payload.transcript_path) ||
      PENDING;
  }

  const file = logPath(dir, sessionId, now);
  const parsed = parseFile(file) || {
    fm: {
      session_id: sessionId,
      date: iso.slice(0, 10),
      author: AUTHOR,
      model,
      tool: TOOL,
      project: path.basename(projectDir),
      total_exchanges: "0",
      first_prompt_time: iso,
      last_prompt_time: iso,
    },
    body:
      `\n# Session Log - ${iso.slice(0, 10)}\n\n` +
      `Session: \`${shortId}\` | Project: \`${path.basename(projectDir)}\` | ` +
      `Author: \`${AUTHOR}\`\n\n---\n\n`,
  };

  const { fm } = parsed;
  // Backfill this session's placeholders now that the model is known. Anchored
  // to a whole line so it only ever rewrites an entry's `model:` header -- the
  // logged text itself can quote the string `model: pending` in prose, and a
  // plain substring replace would corrupt that. Real model names are untouched.
  let body = parsed.body;
  if (MODE === "response" && model !== PENDING) {
    body = body.replace(new RegExp(`^model: ${PENDING}$`, "gm"), `model: ${model}`);
  }
  const prompts = (body.match(/^\[LOG_ENTRY type=PROMPT /gm) || []).length;
  const responses = (body.match(/^\[LOG_ENTRY type=RESPONSE /gm) || []).length;

  let num;
  if (MODE === "prompt") {
    num = prompts + 1;
    fm.total_exchanges = String(num);
    fm.last_prompt_time = iso;
    if (!fm.first_prompt_time) fm.first_prompt_time = iso;
  } else {
    // One response per prompt. A second Stop for an already-answered prompt
    // is a no-op rather than a duplicate entry.
    if (responses >= prompts) return;
    num = responses + 1;
  }
  if (model !== PENDING) fm.model = model;

  fs.writeFileSync(
    file,
    render(fm, body + entryBlock(MODE.toUpperCase(), num, shortId, iso, model, text))
  );
}

try {
  main();
} catch (e) {
  // A capture failure must never block the turn; surface it on stderr only.
  console.error("[capture-agent-log] " + (e && e.stack));
}
