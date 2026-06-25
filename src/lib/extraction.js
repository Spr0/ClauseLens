// Shared, pure clause-extraction logic. No browser or network dependencies, so
// it is used by BOTH the serverless function (to parse the model response) and
// the client (to gate the results table), and is unit-tested directly.

export const CLAUSES = ["Term", "Payment", "Termination", "Liability Cap", "Indemnity"];
export const NOT_FOUND = "Not Found.";

// Parse the model's raw text into a normalized 5-clause result.
// Returns null when the text contains no usable JSON object (no input ran,
// parse failed, or the model returned an empty / non-JSON response). A null
// here is what gates the results table off.
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

  const result = {};
  for (const clause of CLAUSES) {
    const value = parsed[clause];
    result[clause] = typeof value === "string" && value.trim() ? value.trim() : NOT_FOUND;
  }
  return result;
}

// True only when result is an object carrying all five clause keys as
// non-empty strings. The results table renders only when this is true.
export function isValidResult(result) {
  if (!result || typeof result !== "object") return false;
  return CLAUSES.every((c) => typeof result[c] === "string" && result[c].length > 0);
}

export function isNotFound(value) {
  return value === NOT_FOUND;
}

// How many clauses were actually found (not the "Not Found." signal).
export function foundCount(result) {
  if (!isValidResult(result)) return 0;
  return CLAUSES.filter((c) => !isNotFound(result[c])).length;
}
