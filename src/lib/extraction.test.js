import { describe, it, expect } from "vitest";
import {
  CLAUSES,
  NOT_FOUND,
  STATUS_FOUND,
  STATUS_NOT_FOUND,
  parseClauseResponse,
  isValidResult,
  isNotFound,
  foundCount,
} from "./extraction.js";
import { CASCADE_RIDGE_RESULT } from "./sampleContract.js";

// Find a clause object by name in a parsed result.
const get = (result, name) => result.clauses.find((c) => c.name === name);

describe("Cascade Ridge regression (do not break)", () => {
  it("returns four clauses found and Liability Cap Not Found", () => {
    // Simulate the model returning the canonical extraction (with the kind of
    // preamble + fences models sometimes add).
    const modelText =
      "Here is the JSON:\n```json\n" + JSON.stringify(CASCADE_RIDGE_RESULT) + "\n```";

    const parsed = parseClauseResponse(modelText);

    expect(parsed).not.toBeNull();
    expect(isValidResult(parsed)).toBe(true);
    expect(foundCount(parsed)).toBe(4);

    const cap = get(parsed, "Liability Cap");
    expect(cap.quote).toBe(NOT_FOUND);
    expect(cap.status).toBe(STATUS_NOT_FOUND);
    expect(isNotFound(cap)).toBe(true);

    // The four present clauses must NOT be Not Found.
    for (const name of ["Term", "Payment", "Termination", "Indemnity"]) {
      expect(isNotFound(get(parsed, name))).toBe(false);
      expect(get(parsed, name).status).toBe(STATUS_FOUND);
    }

    // The raise list survives parsing and leads with the missing cap.
    expect(parsed.raise.length).toBeGreaterThan(0);
    expect(parsed.raise[0]).toMatch(/liability cap/i);
  });

  it("the cached fallback result is itself valid and matches the contract", () => {
    // Guards the scripted demo fallback against drift.
    expect(isValidResult(CASCADE_RIDGE_RESULT)).toBe(true);
    expect(foundCount(CASCADE_RIDGE_RESULT)).toBe(4);
    expect(get(CASCADE_RIDGE_RESULT, "Liability Cap").quote).toBe(NOT_FOUND);
    expect(Array.isArray(CASCADE_RIDGE_RESULT.raise)).toBe(true);
  });
});

describe("gating: failed / empty / malformed responses do not produce a report", () => {
  it("returns null for empty or non-string input", () => {
    expect(parseClauseResponse("")).toBeNull();
    expect(parseClauseResponse("   ")).toBeNull();
    expect(parseClauseResponse(null)).toBeNull();
    expect(parseClauseResponse(undefined)).toBeNull();
    expect(parseClauseResponse(42)).toBeNull();
  });

  it("returns null when there is no JSON object in the text", () => {
    expect(parseClauseResponse("I could not find any clauses.")).toBeNull();
    expect(parseClauseResponse("Not Found.")).toBeNull();
  });

  it("returns null for JSON that is not an object", () => {
    expect(parseClauseResponse("[1, 2, 3]")).toBeNull();
  });

  it("isValidResult rejects nulls and partial objects", () => {
    expect(isValidResult(null)).toBe(false);
    expect(isValidResult(undefined)).toBe(false);
    expect(isValidResult({})).toBe(false);
    expect(isValidResult({ clauses: [{ name: "Term", quote: "x", plain: "", status: "Found" }] })).toBe(false);
    expect(isValidResult({ clauses: [], raise: [] })).toBe(false);
  });
});

describe("normalization", () => {
  it("fills missing or blank clauses with the Not Found signal", () => {
    const parsed = parseClauseResponse(
      JSON.stringify({
        clauses: [
          { name: "Term", quote: "12 months", plain: "One year term." },
          { name: "Payment", quote: "", plain: "" },
        ],
        raise: ["No liability cap."],
      })
    );
    expect(parsed).not.toBeNull();

    // Every clause present, in canonical order.
    expect(parsed.clauses.map((c) => c.name)).toEqual(CLAUSES);

    const term = get(parsed, "Term");
    expect(term.quote).toBe("12 months");
    expect(term.plain).toBe("One year term.");
    expect(term.status).toBe(STATUS_FOUND);

    expect(get(parsed, "Payment").quote).toBe(NOT_FOUND);
    expect(get(parsed, "Payment").status).toBe(STATUS_NOT_FOUND);
    expect(get(parsed, "Termination").quote).toBe(NOT_FOUND);

    expect(isValidResult(parsed)).toBe(true);
    expect(foundCount(parsed)).toBe(1);
    expect(parsed.raise).toEqual(["No liability cap."]);
  });

  it("treats a 'Not Found' quote string as absent", () => {
    const parsed = parseClauseResponse(
      JSON.stringify({
        clauses: [{ name: "Liability Cap", quote: "Not Found", plain: "n/a", status: "Found" }],
        raise: [],
      })
    );
    const cap = get(parsed, "Liability Cap");
    expect(cap.quote).toBe(NOT_FOUND);
    expect(cap.status).toBe(STATUS_NOT_FOUND);
    expect(cap.plain).toBe("");
  });

  it("trims surrounding whitespace from quotes", () => {
    const parsed = parseClauseResponse(
      JSON.stringify({ clauses: [{ name: "Term", quote: "  12 months  ", plain: "x" }], raise: [] })
    );
    expect(get(parsed, "Term").quote).toBe("12 months");
  });

  it("defaults raise to an empty array when omitted", () => {
    const parsed = parseClauseResponse(
      JSON.stringify({ clauses: [{ name: "Term", quote: "12 months", plain: "x" }] })
    );
    expect(parsed.raise).toEqual([]);
    expect(isValidResult(parsed)).toBe(true);
  });
});
