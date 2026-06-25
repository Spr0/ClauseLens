import { describe, it, expect } from "vitest";
import {
  CLAUSES,
  NOT_FOUND,
  parseClauseResponse,
  isValidResult,
  isNotFound,
  foundCount,
} from "./extraction.js";
import { CASCADE_RIDGE_RESULT } from "./sampleContract.js";

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
    expect(parsed["Liability Cap"]).toBe(NOT_FOUND);
    expect(isNotFound(parsed["Liability Cap"])).toBe(true);
    // The four present clauses must NOT be Not Found.
    for (const clause of ["Term", "Payment", "Termination", "Indemnity"]) {
      expect(isNotFound(parsed[clause])).toBe(false);
    }
  });

  it("the cached fallback result is itself valid and matches the contract", () => {
    // Guards the scripted demo fallback against drift.
    expect(isValidResult(CASCADE_RIDGE_RESULT)).toBe(true);
    expect(foundCount(CASCADE_RIDGE_RESULT)).toBe(4);
    expect(CASCADE_RIDGE_RESULT["Liability Cap"]).toBe(NOT_FOUND);
  });
});

describe("gating: failed / empty / malformed responses do not produce a table", () => {
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
    expect(isValidResult({ Term: "x" })).toBe(false);
  });
});

describe("normalization", () => {
  it("fills missing or blank clause keys with the Not Found signal", () => {
    const parsed = parseClauseResponse(JSON.stringify({ Term: "12 months", Payment: "" }));
    expect(parsed).not.toBeNull();
    // Every clause key present.
    for (const clause of CLAUSES) {
      expect(typeof parsed[clause]).toBe("string");
    }
    expect(parsed.Term).toBe("12 months");
    expect(parsed.Payment).toBe(NOT_FOUND);
    expect(parsed.Termination).toBe(NOT_FOUND);
    // A structurally valid object, even if mostly Not Found.
    expect(isValidResult(parsed)).toBe(true);
    expect(foundCount(parsed)).toBe(1);
  });

  it("trims surrounding whitespace from extracted values", () => {
    const parsed = parseClauseResponse(JSON.stringify({ Term: "  12 months  " }));
    expect(parsed.Term).toBe("12 months");
  });
});
