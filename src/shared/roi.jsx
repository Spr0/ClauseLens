// =============================================================================
// SHARED MODULE A: ROI calculator
// =============================================================================
// Identical across ClauseLens, the RFI drafter, and the Submittal checker.
// Pure client-side math, no document data, so it can run anywhere. The ONLY
// per-app difference lives in ROI_CONFIGS below; the app picks its row with the
// `appKey` prop. Keep this file (and roi.css) byte-identical across the three
// apps. If a change is needed, change it in all three.
// =============================================================================

import { useState } from "react";
import "./roi.css";

// Verbatim headline (always shown).
export const ROI_HEADLINE =
  "A tool you build pays every time the task comes up. Frequency is the multiplier; the return compounds for as long as the tool runs.";

// Per-app config. This is the only thing that differs between the three apps.
export const ROI_CONFIGS = {
  ClauseLens: {
    label: "ClauseLens",
    value: 5,
    freq: 3,
    rankLabel: "Ranked 1",
    minutesWithout: 30,
    minutesWith: 10,
    riskNote: "A missed cap can be catastrophic.",
  },
  RFI: {
    label: "RFI drafter",
    value: 2,
    freq: 4,
    rankLabel: "Ranked 3",
    minutesWithout: 20,
    minutesWith: 8,
    riskNote: "Lower stakes per run.",
  },
  Submittal: {
    label: "Submittal checker",
    value: 3,
    freq: 4,
    rankLabel: "Ranked 2",
    minutesWithout: 25,
    minutesWith: 10,
    riskNote: "Moderate stakes per run.",
  },
};

const VALUE_TIERS = [1, 2, 3, 4, 5];

// Round to the nearest hundred dollars.
export function roundToHundred(n) {
  return Math.round(n / 100) * 100;
}

// The fixed operational ROI formula (spec section 3). Inputs are numbers; the
// component is responsible for coercing empty fields before display. The risk
// term only contributes when a positive riskPerRun is supplied.
export function computeROI({
  minutesWithout,
  minutesWith,
  runsPerMonth,
  loadedHourlyRate,
  riskPerRun,
}) {
  const timeSavedPerRun = minutesWithout - minutesWith; // minutes
  const annualHoursSaved = (timeSavedPerRun * runsPerMonth * 12) / 60;
  const riskTerm = riskPerRun ? riskPerRun * runsPerMonth * 12 : 0;
  const annualDollars = roundToHundred(annualHoursSaved * loadedHourlyRate + riskTerm);
  return { timeSavedPerRun, annualHoursSaved, annualDollars };
}

// Empty string -> NaN-safe number. Returns null when the field is blank so the
// UI can show a placeholder dash instead of a fabricated value.
function toNum(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtHours(n) {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 1 })} hrs`;
}

function fmtDollars(n) {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function ROICalculator({ appKey }) {
  const config = ROI_CONFIGS[appKey] || ROI_CONFIGS.ClauseLens;

  const [value, setValue] = useState(config.value);
  const [freq, setFreq] = useState(config.freq);
  const [minutesWithout, setMinutesWithout] = useState(String(config.minutesWithout));
  const [minutesWith, setMinutesWith] = useState(String(config.minutesWith));
  const [runsPerMonth, setRunsPerMonth] = useState("");
  const [loadedHourlyRate, setLoadedHourlyRate] = useState("");
  const [riskPerRun, setRiskPerRun] = useState("");

  const reset = () => {
    setValue(config.value);
    setFreq(config.freq);
    setMinutesWithout(String(config.minutesWithout));
    setMinutesWith(String(config.minutesWith));
    setRunsPerMonth("");
    setLoadedHourlyRate("");
    setRiskPerRun("");
  };

  const kitScore = value * freq;

  // Coerce inputs. timeSavedPerRun needs only the two minute fields; the annual
  // figures need runs (and, for dollars, a rate). We never invent a rate or a
  // runs-per-month figure, so those outputs stay blank until entered.
  const mWithout = toNum(minutesWithout);
  const mWith = toNum(minutesWith);
  const runs = toNum(runsPerMonth);
  const rate = toNum(loadedHourlyRate);
  const risk = toNum(riskPerRun);

  const haveTime = mWithout !== null && mWith !== null;
  const timeSavedPerRun = haveTime ? mWithout - mWith : null;

  let annualHoursSaved = null;
  let annualDollars = null;
  if (haveTime && runs !== null) {
    const r = computeROI({
      minutesWithout: mWithout,
      minutesWith: mWith,
      runsPerMonth: runs,
      loadedHourlyRate: rate !== null ? rate : 0,
      riskPerRun: risk !== null ? risk : 0,
    });
    annualHoursSaved = r.annualHoursSaved;
    if (rate !== null) annualDollars = r.annualDollars;
  }

  return (
    <section className="kit-roi" aria-label="ROI estimate">
      <h3 className="kit-roi-title">Return on building this tool</h3>
      <p className="kit-roi-headline">{ROI_HEADLINE}</p>

      {/* Part 1: the kit score */}
      <div className="kit-roi-block">
        <div className="kit-roi-block-label">1 · Kit score</div>
        <div className="kit-roi-row">
          <label className="kit-roi-field">
            <span>Value</span>
            <select value={value} onChange={(e) => setValue(Number(e.target.value))}>
              {VALUE_TIERS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <span className="kit-roi-op">×</span>
          <label className="kit-roi-field">
            <span>Frequency</span>
            <select value={freq} onChange={(e) => setFreq(Number(e.target.value))}>
              {VALUE_TIERS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <span className="kit-roi-op">=</span>
          <div className="kit-roi-score">
            <span className="kit-roi-score-num">{kitScore}</span>
            <span className="kit-roi-score-rank">{config.rankLabel}</span>
          </div>
        </div>
      </div>

      {/* Part 2: the operational ROI */}
      <div className="kit-roi-block">
        <div className="kit-roi-block-label">2 · Operational ROI</div>
        <div className="kit-roi-inputs">
          <label className="kit-roi-field">
            <span>Minutes without the tool</span>
            <input type="number" min="0" value={minutesWithout}
              onChange={(e) => setMinutesWithout(e.target.value)} />
          </label>
          <label className="kit-roi-field">
            <span>Minutes with the tool</span>
            <input type="number" min="0" value={minutesWith}
              onChange={(e) => setMinutesWith(e.target.value)} />
          </label>
          <label className="kit-roi-field">
            <span>Runs per month</span>
            <input type="number" min="0" placeholder="e.g. 20" value={runsPerMonth}
              onChange={(e) => setRunsPerMonth(e.target.value)} />
          </label>
          <label className="kit-roi-field">
            <span>Loaded hourly rate ($)</span>
            <input type="number" min="0" placeholder="your number" value={loadedHourlyRate}
              onChange={(e) => setLoadedHourlyRate(e.target.value)} />
          </label>
          <label className="kit-roi-field">
            <span>Dollars at risk per run (optional)</span>
            <input type="number" min="0" placeholder="optional" value={riskPerRun}
              onChange={(e) => setRiskPerRun(e.target.value)} />
            <small className="kit-roi-note">{config.riskNote}</small>
          </label>
        </div>

        <div className="kit-roi-stats">
          <div className="kit-roi-stat">
            <div className="kit-roi-stat-label">Time saved per run</div>
            <div className="kit-roi-stat-value">
              {timeSavedPerRun !== null ? `${timeSavedPerRun} min` : "—"}
            </div>
          </div>
          <div className="kit-roi-stat">
            <div className="kit-roi-stat-label">Hours saved per year</div>
            <div className="kit-roi-stat-value">
              {annualHoursSaved !== null ? fmtHours(annualHoursSaved) : "—"}
            </div>
          </div>
          <div className="kit-roi-stat kit-roi-stat-hero">
            <div className="kit-roi-stat-label">Dollars per year</div>
            <div className="kit-roi-stat-value">
              {annualDollars !== null ? fmtDollars(annualDollars) : "—"}
            </div>
          </div>
        </div>

        <button type="button" className="kit-roi-reset" onClick={reset}>Reset</button>
      </div>
    </section>
  );
}
