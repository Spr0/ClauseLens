// Shared, pure clause-extraction logic. No browser or network dependencies, so
// it is used by BOTH the serverless function (to parse the model response) and
// the client (to gate the results), and is unit-tested directly.

export const CLAUSES = ["Term", "Payment", "Termination", "Liability Cap", "Indemnity"];
export const NOT_FOUND = "Not Found.";
export const STATUS_FOUND = "Found";
export const STATUS_NOT_FOUND = "Not Found";

// A quote is "absent" when the model left it blank or signalled not-found in any
// of the common phrasings.
function isAbsentQuote(quote) {
  if (typeof quote !== "string") return true;
  const q = quote.trim();
  if (!q) return true;
  return /^not\s+found\.?$/i.test(q);
}

// Parse the model's raw text into a normalized result:
//   { clauses: [{ name, quote, plain, status }], raise: [string] }
// over the five fixed clauses, in canonical order. Returns null when the text
// carries no usable JSON object (no input ran, parse failed, or a non-JSON
// response). A null here is what gates the report off.
export function parseClauseResponse(text) {
  if (typeof text !== "string") return null;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let parsed;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  // Index whatever clause entries the model returned, by name (case-insensitive).
  const byName = {};
  if (Array.isArray(parsed.clauses)) {
    for (const entry of parsed.clauses) {
      if (entry && typeof entry.name === "string") {
        byName[entry.name.trim().toLowerCase()] = entry;
      }
    }
  }

  const clauses = CLAUSES.map((name) => {
    const entry = byName[name.toLowerCase()] || {};
    const absent = isAbsentQuote(entry.quote);
    const plain =
      typeof entry.plain === "string" && entry.plain.trim() ? entry.plain.trim() : "";
    return {
      name,
      quote: absent ? NOT_FOUND : entry.quote.trim(),
      plain: absent ? "" : plain,
      status: absent ? STATUS_NOT_FOUND : STATUS_FOUND,
    };
  });

  const raise = Array.isArray(parsed.raise)
    ? parsed.raise.map((r) => (typeof r === "string" ? r.trim() : "")).filter(Boolean)
    : [];

  return { clauses, raise };
}

// True only when result carries all five clauses (correct names, string
// quote/plain/status) and a raise array. The report renders only when true.
export function isValidResult(result) {
  if (!result || typeof result !== "object") return false;
  if (!Array.isArray(result.clauses) || result.clauses.length !== CLAUSES.length) return false;
  if (!Array.isArray(result.raise)) return false;
  return CLAUSES.every((name, i) => {
    const c = result.clauses[i];
    return (
      c &&
      c.name === name &&
      typeof c.quote === "string" &&
      c.quote.length > 0 &&
      typeof c.plain === "string" &&
      (c.status === STATUS_FOUND || c.status === STATUS_NOT_FOUND)
    );
  });
}

export function isNotFound(clause) {
  return clause && clause.status === STATUS_NOT_FOUND;
}

// How many clauses were actually found.
export function foundCount(result) {
  if (!isValidResult(result)) return 0;
  return result.clauses.filter((c) => c.status === STATUS_FOUND).length;
}
