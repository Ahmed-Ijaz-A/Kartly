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
const DEBUG = process.env.AGENT_LOG_DEBUG === "1";

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

/** Most recent model seen in the transcript, for labelling prompts. */
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

  if (DEBUG) {
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(
      path.join(dir, ".hook-payloads.debug.jsonl"),
      JSON.stringify({ at: iso, mode: MODE, payload }) + "\n"
    );
  }

  const lines = readTranscript(payload.transcript_path);

  let text;
  let model;
  if (MODE === "prompt") {
    text = payload.prompt ?? "";
    if (!text.trim()) return;
    model = payload.model || lastModel(lines) || "unknown";
  } else {
    const r = finalResponse(lines);
    if (!r.text) return;
    text = r.text;
    model = r.model || payload.model || lastModel(lines) || "unknown";
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

  const { fm, body } = parsed;
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
  fm.model = model;

  fs.writeFileSync(
    file,
    render(fm, body + entryBlock(MODE.toUpperCase(), num, shortId, iso, model, text))
  );

  // Append-only mirror: tamper-evident copy, independent of the .md rewrite.
  fs.mkdirSync(path.join(dir, "raw"), { recursive: true });
  fs.appendFileSync(
    path.join(dir, "raw", `${sessionId}.jsonl`),
    JSON.stringify({
      type: MODE.toUpperCase(),
      num,
      session: sessionId,
      timestamp: iso,
      model,
      text,
    }) + "\n"
  );
}

try {
  main();
} catch (e) {
  if (DEBUG) console.error("[capture-agent-log] " + (e && e.stack));
}
