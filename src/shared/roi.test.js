import { describe, it, expect } from "vitest";
import { computeROI, roundToHundred, ROI_CONFIGS } from "./roi.jsx";

describe("roundToHundred", () => {
  it("rounds to the nearest hundred", () => {
    expect(roundToHundred(12049)).toBe(12000);
    expect(roundToHundred(12050)).toBe(12100);
    expect(roundToHundred(0)).toBe(0);
  });
});

describe("computeROI (spec section 3 formula)", () => {
  it("computes time, hours, and dollars for the ClauseLens defaults", () => {
    const { minutesWithout, minutesWith } = ROI_CONFIGS.clauselens; // 30, 10
    const r = computeROI({
      minutesWithout,
      minutesWith,
      runsPerMonth: 20,
      loadedHourlyRate: 150,
      riskPerRun: 0,
    });
    expect(r.timeSavedPerRun).toBe(20); // 30 - 10
    expect(r.annualHoursSaved).toBe(80); // 20 * 20 * 12 / 60
    expect(r.annualDollars).toBe(12000); // 80 * 150
  });

  it("adds the risk term only when riskPerRun is provided", () => {
    const base = computeROI({
      minutesWithout: 30,
      minutesWith: 10,
      runsPerMonth: 20,
      loadedHourlyRate: 150,
      riskPerRun: 0,
    });
    const withRisk = computeROI({
      minutesWithout: 30,
      minutesWith: 10,
      runsPerMonth: 20,
      loadedHourlyRate: 150,
      riskPerRun: 500,
    });
    expect(base.annualDollars).toBe(12000);
    // 12000 + (500 * 20 * 12) = 12000 + 120000 = 132000
    expect(withRisk.annualDollars).toBe(132000);
  });

  it("rounds dollars to the nearest hundred", () => {
    const r = computeROI({
      minutesWithout: 25,
      minutesWith: 10,
      runsPerMonth: 7,
      loadedHourlyRate: 137,
      riskPerRun: 0,
    });
    // 15 * 7 * 12 / 60 = 21 hrs; 21 * 137 = 2877 -> 2900
    expect(r.annualHoursSaved).toBe(21);
    expect(r.annualDollars).toBe(2900);
  });
});
