// =============================================================================
// ClauseLens - analyze function
// =============================================================================
// Holds the Anthropic key (server side only) and runs the two model calls the
// app needs: clause extraction and per-clause explanation. The browser never
// talks to api.anthropic.com directly and never sees the key.
//
// Security posture (see ClauseLens_Fix_Spec):
//   - POST only, same-origin (plus an optional ALLOWED_ORIGIN allowlist).
//   - Payload shape validated before any model call.
//   - Input size capped; oversized input rejected with a clean message.
//   - Best-effort per-IP rate limit to protect the key from abuse.
//   - Contract text is processed in memory and never logged or persisted.
//   - Errors are sanitized: the client gets a generic message, details stay
//     in the server logs (and even there, never the contract body).
//   - Model id comes from the environment (ANTHROPIC_MODEL), no hardcoded
//     default, so a missing config fails in config rather than silently.
// =============================================================================

import { parseClauseResponse, isValidResult } from "../../src/lib/extraction.js";

const MAX_CHARS = 100000; // ~25k tokens of contract text, a sane ceiling
const EXTRACT_MAX_TOKENS = 2000;
const EXPLAIN_MAX_TOKENS = 1024;
const RATE_LIMIT = 15; // requests per IP per window
const RATE_WINDOW_MS = 60 * 1000;

const SYSTEM_PROMPT = `You are a legal contract analyst. Extract specific clauses from contract text.
Return ONLY a valid JSON object with exactly these keys: "Term", "Payment", "Termination", "Liability Cap", "Indemnity".
For each key, provide the relevant extracted text from the contract. If a clause is not found, use the string "Not Found."
Be concise, extract the most relevant sentence(s) for each clause. Do not include preamble or explanation, only the JSON object.`;

const EXPLAIN_PROMPT = `You are a legal contract analyst. A user extracted a clause from a contract and wants to understand how you identified it.
Given the clause name, the extracted text, and the original contract, explain in 2-3 plain-language sentences:
1. Where in the contract you found this clause
2. Why this text was chosen as the most relevant excerpt
3. Any caveats or nuances the user should be aware of
Be concise and plain-language. Do not use legal jargon without explaining it.`;

// Light, best-effort in-memory rate limit. Per function instance, which is
// plenty for a single-room demo. Not a hard security control.
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now - rec.start > RATE_WINDOW_MS) {
    hits.set(ip, { start: now, count: 1 });
    return false;
  }
  rec.count += 1;
  return rec.count > RATE_LIMIT;
}

function env(name) {
  if (typeof Netlify !== "undefined" && Netlify.env?.get) return Netlify.env.get(name);
  return process.env[name];
}

// Same-origin by default. ALLOWED_ORIGIN (comma separated) can add origins;
// localhost is always allowed for local dev.
function allowedOrigin(req) {
  const origin = req.headers.get("origin");
  if (!origin) return null; // non-browser or same-origin request without Origin
  const list = (env("ALLOWED_ORIGIN") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.includes(origin)) return origin;
  try {
    const host = req.headers.get("host");
    if (host && new URL(origin).host === host) return origin; // same-origin
  } catch {
    // fall through
  }
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return false; // present but not allowed
}

function corsHeaders(origin) {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    vary: "Origin",
  };
  if (origin) {
    headers["access-control-allow-origin"] = origin;
    headers["access-control-allow-methods"] = "POST, OPTIONS";
    headers["access-control-allow-headers"] = "content-type";
  }
  return headers;
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

async function callModel({ apiKey, model, system, userText, maxTokens }) {
  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userText }],
    }),
  });

  const data = await upstream.json().catch(() => null);
  if (!upstream.ok || !data || data.error) {
    const detail = data?.error?.message || `status ${upstream.status}`;
    const err = new Error(detail);
    err.upstream = true;
    throw err;
  }
  const text = data.content?.find((b) => b.type === "text")?.text || "";
  if (!text) throw new Error("empty model response");
  return text;
}

export default async (req, context) => {
  const origin = allowedOrigin(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin || undefined) });
  }
  if (origin === false) {
    return json({ error: "Origin not allowed." }, 403, undefined);
  }
  if (req.method !== "POST") {
    return json({ error: "Method Not Allowed" }, 405, origin || undefined);
  }

  const ip =
    context?.ip ||
    req.headers.get("x-nf-client-connection-ip") ||
    req.headers.get("x-forwarded-for") ||
    "unknown";
  if (rateLimited(ip)) {
    return json({ error: "Too many requests. Wait a minute and try again." }, 429, origin || undefined);
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid request body." }, 400, origin || undefined);
  }

  const mode = payload?.mode;
  if (mode !== "extract" && mode !== "explain") {
    return json({ error: "Invalid request." }, 400, origin || undefined);
  }

  const apiKey = env("ANTHROPIC_API_KEY");
  const model = env("ANTHROPIC_MODEL");
  if (!apiKey || !model) {
    // Fail in config, not silently. Never tell the client which is missing.
    console.error(
      `[analyze] missing config: ${!apiKey ? "ANTHROPIC_API_KEY " : ""}${!model ? "ANTHROPIC_MODEL" : ""}`.trim()
    );
    return json({ error: "Service is not configured. Try again later." }, 503, origin || undefined);
  }

  try {
    if (mode === "extract") {
      const contractText = payload?.contractText;
      if (typeof contractText !== "string" || contractText.trim().length === 0) {
        return json(
          { error: "No contract text received. Paste the text or upload a readable file." },
          400,
          origin || undefined
        );
      }
      if (contractText.length > MAX_CHARS) {
        return json(
          { error: `Contract is too long. Limit ${MAX_CHARS.toLocaleString()} characters.` },
          413,
          origin || undefined
        );
      }
      const raw = await callModel({
        apiKey,
        model,
        system: SYSTEM_PROMPT,
        userText: `Extract the 5 key clauses from this contract:\n\n${contractText}`,
        maxTokens: EXTRACT_MAX_TOKENS,
      });
      const result = parseClauseResponse(raw);
      if (!isValidResult(result)) {
        console.error("[analyze] extract: could not parse a valid result from the model");
        return json({ error: "Could not read a result from the analysis. Try again." }, 502, origin || undefined);
      }
      return json({ result }, 200, origin || undefined);
    }

    // mode === "explain"
    const { clause, extracted, contractExcerpt } = payload || {};
    if (
      typeof clause !== "string" ||
      typeof extracted !== "string" ||
      typeof contractExcerpt !== "string"
    ) {
      return json({ error: "Invalid request." }, 400, origin || undefined);
    }
    if (contractExcerpt.length > MAX_CHARS) {
      return json({ error: "Contract is too long to explain." }, 413, origin || undefined);
    }
    const explanation = await callModel({
      apiKey,
      model,
      system: EXPLAIN_PROMPT,
      userText: `Clause: ${clause}\nExtracted text: ${extracted}\n\nContract excerpt:\n${contractExcerpt}`,
      maxTokens: EXPLAIN_MAX_TOKENS,
    });
    return json({ explanation }, 200, origin || undefined);
  } catch (err) {
    // Log a sanitized line server side. Never log the contract body, never
    // return raw model errors or stack traces to the client.
    console.error(`[analyze] ${mode} failed: ${err?.message || "unknown error"}`);
    return json({ error: "Analysis failed. Please try again." }, 502, origin || undefined);
  }
};

export const config = {
  path: "/api/analyze",
};
