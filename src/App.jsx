import { useState, useCallback } from "react";
import * as mammoth from "mammoth";
import { extractPdfText, ScannedPdfError } from "./lib/pdf";
import { isValidResult } from "./lib/extraction.js";
import { CASCADE_RIDGE_TEXT, CASCADE_RIDGE_RESULT } from "./lib/sampleContract.js";

const CLAUSES = ["Term", "Payment", "Termination", "Liability Cap", "Indemnity"];

// Study Groups palette (shared with the rest of the demo suite).
const T = {
  royal: "#122a9b",
  brick: "#c73c2f",
  ink: "#1a1c20",
  white: "#ffffff",
  panel: "#f3f5fb",
  hair: "#dbe0ea",
  grey1: "#3a3d44",
  grey2: "#4a4d55",
  grey3: "#6b6e76",
  display: '"Barlow Semi Condensed", system-ui, sans-serif',
  body: '"Spectral", Georgia, serif',
  mono: '"Space Mono", ui-monospace, "SF Mono", monospace',
};

// The browser never talks to api.anthropic.com directly anymore. It calls our
// own serverless function, which holds the key in server env only.
async function postAnalyze(body) {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("The analysis service returned an unexpected response.");
  }
  if (!res.ok || data.error) {
    throw new Error(data.error || "Analysis failed. Please try again.");
  }
  return data;
}

async function extractClauses(contractText) {
  const data = await postAnalyze({ mode: "extract", contractText });
  return data.result;
}

async function explainClause(clause, extracted, contractExcerpt) {
  const data = await postAnalyze({ mode: "explain", clause, extracted, contractExcerpt });
  return data.explanation;
}

function Spinner({ size = 14 }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: `2px solid ${T.hair}`,
        borderTopColor: T.royal,
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

function ClauseRow({ clause, value, contractText, rowIndex }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [savedValue, setSavedValue] = useState(value);
  const [explanation, setExplanation] = useState(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const notFound = savedValue === "Not Found.";

  const handleSave = () => { setSavedValue(editValue); setEditing(false); };
  const handleCancel = () => { setEditValue(savedValue); setEditing(false); };

  const handleExplain = async () => {
    if (explanation) { setShowExplanation(!showExplanation); return; }
    setExplainLoading(true);
    setExplainError(null);
    setShowExplanation(true);
    try {
      const contractSnippet = typeof contractText === "string"
        ? contractText.slice(0, 6000)
        : "[PDF, text not available for explanation]";
      const result = await explainClause(clause, savedValue, contractSnippet);
      setExplanation(result);
    } catch (err) {
      setExplainError(`Explanation failed: ${err.message}`);
    } finally {
      setExplainLoading(false);
    }
  };

  const btnBase = {
    border: `1px solid ${T.hair}`, borderRadius: "5px", padding: "5px 12px",
    fontSize: "11px", fontFamily: T.display, fontWeight: "700", cursor: "pointer",
    letterSpacing: "0.05em", textTransform: "uppercase",
  };

  return (
    <>
      <tr style={{
        borderBottom: showExplanation ? "none" : `1px solid ${T.hair}`,
        background: rowIndex % 2 === 0 ? T.panel : T.white,
      }}>
        <td style={{
          padding: "16px", color: T.royal, fontWeight: "700", verticalAlign: "top",
          whiteSpace: "nowrap", fontFamily: T.display, fontSize: "14px", letterSpacing: "0.02em",
          textTransform: "uppercase", width: "150px",
        }}>{clause}</td>

        <td style={{ padding: "16px", verticalAlign: "top" }}>
          {editing ? (
            <div>
              <textarea
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                autoFocus
                style={{
                  width: "100%", minHeight: "80px", background: T.white,
                  border: `1px solid ${T.royal}`, borderRadius: "6px", color: T.ink,
                  fontFamily: T.body, fontSize: "15px", lineHeight: "1.6",
                  padding: "10px", resize: "vertical", outline: "none",
                  boxSizing: "border-box", marginBottom: "8px",
                }}
              />
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={handleSave} style={{
                  ...btnBase, background: T.royal, color: T.white, border: "none",
                }}>Save</button>
                <button onClick={handleCancel} style={{
                  ...btnBase, background: T.white, color: T.grey2,
                }}>Cancel</button>
              </div>
            </div>
          ) : (
            <span style={{
              color: notFound ? T.grey3 : T.ink, lineHeight: "1.7",
              fontStyle: notFound ? "italic" : "normal",
              fontFamily: T.body, fontSize: "15px", display: "block", marginBottom: "4px",
            }}>{savedValue}</span>
          )}
        </td>

        <td style={{ padding: "16px 16px 16px 0", verticalAlign: "top", whiteSpace: "nowrap" }}>
          {!editing && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end" }}>
              <button onClick={() => setEditing(true)} style={{
                ...btnBase, background: T.white, color: T.royal,
              }}>Edit</button>
              <button onClick={handleExplain} style={{
                ...btnBase,
                background: showExplanation ? "rgba(18,42,155,0.08)" : T.white,
                color: T.royal,
                borderColor: showExplanation ? T.royal : T.hair,
                display: "flex", alignItems: "center", gap: "5px",
              }}>
                {explainLoading ? <><Spinner size={10} />Asking</> : "Explain"}
              </button>
            </div>
          )}
        </td>
      </tr>

      {showExplanation && (
        <tr style={{ borderBottom: `1px solid ${T.hair}` }}>
          <td colSpan={3} style={{ padding: "0 16px 16px 16px" }}>
            <div style={{
              background: T.panel, border: `1px solid ${T.hair}`, borderLeft: `3px solid ${T.royal}`,
              borderRadius: "6px", padding: "14px 16px", fontFamily: T.body,
              fontSize: "15px", lineHeight: "1.7", color: T.ink,
            }}>
              {explainLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: T.grey3 }}>
                  <Spinner size={12} /> Generating explanation
                </div>
              ) : explainError ? (
                <span style={{ color: "#8f2b22", wordBreak: "break-word" }}>{explainError}</span>
              ) : (
                <>
                  <div style={{
                    color: T.brick, fontSize: "11px", letterSpacing: "0.1em",
                    textTransform: "uppercase", marginBottom: "8px", fontWeight: "700",
                    fontFamily: T.display,
                  }}>AI Explanation</div>
                  {explanation}
                </>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ROIPanel() {
  const [rate, setRate] = useState(150);
  const [contracts, setContracts] = useState(20);

  const manualMinutes = 25;
  const aiMinutes = 1.5;
  const savedMinutesEach = manualMinutes - aiMinutes;
  const totalSavedHours = (savedMinutesEach * contracts) / 60;
  const totalSavedDollars = totalSavedHours * rate;
  const annualContracts = contracts * 12;
  const annualSavedHours = (savedMinutesEach * annualContracts) / 60;
  const annualSavedDollars = annualSavedHours * rate;

  const statStyle = {
    background: T.panel, border: `1px solid ${T.hair}`,
    borderRadius: "8px", padding: "16px 20px", flex: "1", minWidth: "120px",
  };
  const labelStyle = {
    fontFamily: T.display, fontSize: "11px", letterSpacing: "0.08em",
    textTransform: "uppercase", color: T.brick, fontWeight: "700", marginBottom: "6px",
  };
  const valueStyle = {
    fontFamily: T.display, fontSize: "24px", fontWeight: "800", color: T.royal,
  };
  const subStyle = {
    fontFamily: T.body, fontSize: "12px", color: T.grey3, marginTop: "2px",
  };
  const inputStyle = {
    background: T.white, border: `1px solid ${T.hair}`, borderRadius: "6px",
    color: T.ink, fontFamily: T.body, fontSize: "14px",
    padding: "5px 10px", width: "80px", outline: "none", textAlign: "right",
  };

  return (
    <div>
      <div style={{
        fontFamily: T.display, fontSize: "13px", letterSpacing: "0.05em",
        textTransform: "uppercase", color: T.ink, fontWeight: "700", marginBottom: "16px",
        paddingBottom: "4px", borderBottom: `2px solid ${T.hair}`,
      }}>Time Saved · ROI Estimate</div>

      {/* Assumptions */}
      <div style={{
        display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "20px",
        fontFamily: T.body, fontSize: "14px", color: T.grey2, alignItems: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span>Hourly rate ($)</span>
          <input
            type="number" value={rate} min={50} max={1000} step={25}
            onChange={e => setRate(Number(e.target.value))}
            style={inputStyle}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span>Contracts / month</span>
          <input
            type="number" value={contracts} min={1} max={500} step={1}
            onChange={e => setContracts(Number(e.target.value))}
            style={inputStyle}
          />
        </div>
        <div style={{ color: T.grey3, fontSize: "13px", fontStyle: "italic" }}>
          Assumes 25 min manual, about 1.5 min with AI
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <div style={statStyle}>
          <div style={labelStyle}>Per Contract</div>
          <div style={valueStyle}>{savedMinutesEach.toFixed(0)} min</div>
          <div style={subStyle}>saved per review</div>
        </div>
        <div style={statStyle}>
          <div style={labelStyle}>Monthly Hours</div>
          <div style={valueStyle}>{totalSavedHours.toFixed(1)} hrs</div>
          <div style={subStyle}>{contracts} contracts, {totalSavedHours.toFixed(1)} hrs freed</div>
        </div>
        <div style={statStyle}>
          <div style={labelStyle}>Monthly Value</div>
          <div style={valueStyle}>${totalSavedDollars.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div style={subStyle}>at ${rate}/hr loaded cost</div>
        </div>
        <div style={{ ...statStyle, border: `1px solid ${T.royal}`, background: "rgba(18,42,155,0.06)" }}>
          <div style={labelStyle}>Annual Value</div>
          <div style={{ ...valueStyle, fontSize: "28px" }}>${annualSavedDollars.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div style={subStyle}>{annualSavedHours.toFixed(0)} hrs, {annualContracts} contracts/yr</div>
        </div>
      </div>

      <div style={{
        marginTop: "12px", fontFamily: T.body, fontSize: "12px",
        color: T.grey3, fontStyle: "italic",
      }}>
        Estimates only. Actual time savings vary by contract complexity, reviewer experience, and review scope.
        Does not account for AI error correction time or legal review requirements.
      </div>
    </div>
  );
}

export default function ClauseLens() {
  const [contractText, setContractText] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [isSample, setIsSample] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);
  const [simulateOffline, setSimulateOffline] = useState(false);

  const processFile = useCallback(async (file) => {
    setFileName(file.name);
    setError(null);
    setContractText("");
    setIsSample(false);
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const text = await extractPdfText(arrayBuffer);
        setContractText(text);
      } catch (e) {
        setFileName(null);
        const msg = e instanceof ScannedPdfError
          ? e.message
          : "Could not read this PDF. Try pasting the contract text.";
        setError(msg);
      }
    } else if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".docx")
    ) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        if (!result.value || result.value.trim().length === 0) {
          setError("Could not extract text. Try pasting the text manually.");
        } else {
          setContractText(result.value);
        }
      } catch (e) {
        setError(`DOCX read failed: ${e.message}`);
      }
    } else {
      setError("Please upload a PDF or DOCX file.");
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileInput = useCallback((e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const loadSample = () => {
    setContractText(CASCADE_RIDGE_TEXT);
    setIsSample(true);
    setFileName(null);
    setError(null);
    setResults(null);
    setUsedFallback(false);
  };

  const analyze = async () => {
    const text = typeof contractText === "string" ? contractText : "";
    if (text.trim().length === 0) {
      setError("No contract text to analyze. Paste text or upload a readable file.");
      return;
    }
    // We only have a vetted cached result for the sample contract, so the
    // scripted fallback is offered only when the loaded text IS the sample.
    // Never fabricate a result for an arbitrary contract.
    const sample = isSample && text === CASCADE_RIDGE_TEXT;

    setLoading(true); setError(null); setResults(null); setUsedFallback(false);

    // Demo switch: deliberately show the saved-example path on stage.
    if (sample && simulateOffline) {
      setResults(CASCADE_RIDGE_RESULT);
      setUsedFallback(true);
      setLoading(false);
      return;
    }

    try {
      const result = await extractClauses(text);
      // Gate the table: only render on a valid, structured 5-clause result.
      // Anything else stays an error, never a false "Not Found" table.
      if (!isValidResult(result)) {
        throw new Error("Could not read a clear result from this contract. Try again, or paste the text.");
      }
      setResults(result);
    } catch (err) {
      if (sample) {
        // The demo never dies: fall back to the vetted cached result.
        setResults(CASCADE_RIDGE_RESULT);
        setUsedFallback(true);
      } else {
        setError(err.message || "Analysis failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setContractText(""); setResults(null); setError(null);
    setFileName(null); setIsSample(false); setUsedFallback(false);
  };
  const hasText = typeof contractText === "string" ? contractText.trim().length > 0 : !!contractText;

  const sectionLabel = {
    fontFamily: T.display, fontSize: "11px", letterSpacing: "0.1em",
    textTransform: "uppercase", color: T.brick, fontWeight: "700",
  };

  return (
    <div style={{ minHeight: "100vh", background: T.white, fontFamily: T.body, color: T.ink }}>
      {/* Masthead - shared Study Groups lockup */}
      <header style={{ background: T.royal, color: T.white }}>
        <div style={{
          maxWidth: "1000px", margin: "0 auto", padding: "14px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{
              fontFamily: T.display, fontWeight: "800", fontSize: "20px", letterSpacing: "0.04em",
              background: T.white, color: T.royal, padding: "2px 8px", borderRadius: "3px",
            }}>SG</span>
            <span style={{
              fontFamily: T.display, fontWeight: "700", fontSize: "20px",
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}>Study Groups</span>
          </div>
          <div style={{
            fontFamily: T.display, fontWeight: "600", fontSize: "14px",
            letterSpacing: "0.05em", textTransform: "uppercase", opacity: 0.92, textAlign: "right",
          }}>ClauseLens · Contract Intelligence</div>
        </div>
      </header>

      {/* Product band */}
      <div style={{ borderBottom: `1px solid ${T.hair}`, background: T.panel }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "28px 24px 24px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
            <span style={{ fontFamily: T.display, fontSize: "34px", fontWeight: "800", letterSpacing: "0.01em", color: T.ink }}>ClauseLens</span>
            <span style={{ ...sectionLabel, fontSize: "12px", letterSpacing: "0.18em" }}>Contract Clause Extractor</span>
          </div>
          <div style={{ fontSize: "16px", color: T.grey2, marginTop: "6px", fontFamily: T.body }}>
            Extract key clauses in seconds · Term · Payment · Termination · Liability Cap · Indemnity
          </div>
        </div>
      </div>

      <div style={{ padding: "32px 24px", maxWidth: "1000px", margin: "0 auto" }}>
        {!results ? (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input").click()}
              style={{
                border: `1.5px dashed ${dragOver ? T.royal : T.hair}`,
                borderRadius: "8px", padding: "24px", textAlign: "center", marginBottom: "20px",
                cursor: "pointer", transition: "border-color 0.2s, background 0.2s",
                background: dragOver ? "rgba(18,42,155,0.04)" : T.panel,
              }}
            >
              <input id="file-input" type="file" accept=".pdf,.docx" style={{ display: "none" }} onChange={handleFileInput} />
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>📄</div>
              {fileName ? (
                <div style={{ color: T.royal, fontFamily: T.display, fontSize: "15px", fontWeight: "700" }}>✓ {fileName}</div>
              ) : (
                <>
                  <div style={{ color: T.ink, fontFamily: T.display, fontSize: "15px", fontWeight: "600" }}>Drop a PDF or DOCX here, or click to browse</div>
                  <div style={{ color: T.grey3, fontFamily: T.body, fontSize: "13px", marginTop: "4px" }}>or paste contract text below</div>
                </>
              )}
            </div>

            {(!fileName || typeof contractText === "string") && (
              <textarea
                value={typeof contractText === "string" ? contractText : ""}
                onChange={(e) => { setContractText(e.target.value); setFileName(null); setIsSample(false); }}
                placeholder="Paste contract text here, or load the sample below"
                style={{
                  width: "100%", minHeight: "220px", background: T.white,
                  border: `1px solid ${T.hair}`, borderRadius: "8px", color: T.ink,
                  fontFamily: T.body, fontSize: "15px", lineHeight: "1.7",
                  padding: "16px", resize: "vertical", outline: "none",
                  boxSizing: "border-box", marginBottom: "20px",
                }}
                onFocus={(e) => e.target.style.borderColor = T.royal}
                onBlur={(e) => e.target.style.borderColor = T.hair}
              />
            )}

            {error && (
              <div style={{
                background: "rgba(199,60,47,0.1)", border: `1px solid ${T.brick}`,
                borderRadius: "6px", padding: "12px 16px", color: "#8f2b22",
                fontFamily: T.body, fontSize: "15px",
                marginBottom: "20px", wordBreak: "break-word",
              }}>{error}</div>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
              <button onClick={analyze} disabled={!hasText || loading} style={{
                background: hasText && !loading ? T.royal : T.hair,
                color: hasText && !loading ? T.white : T.grey3,
                border: "none", borderRadius: "6px", padding: "12px 24px",
                fontSize: "14px", fontFamily: T.display, fontWeight: "700",
                cursor: hasText && !loading ? "pointer" : "not-allowed",
                letterSpacing: "0.05em", textTransform: "uppercase",
                display: "flex", alignItems: "center", gap: "10px",
              }}>
                {loading ? <><Spinner /> Analyzing contract</> : "Extract Clauses"}
              </button>

              <button onClick={loadSample} disabled={loading} style={{
                background: T.white, color: T.royal, border: `1px solid ${T.royal}`,
                borderRadius: "6px", padding: "12px 20px",
                fontSize: "14px", fontFamily: T.display, fontWeight: "700",
                cursor: loading ? "not-allowed" : "pointer",
                letterSpacing: "0.05em", textTransform: "uppercase",
              }}>Load Sample</button>

              <label style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                fontFamily: T.body, fontSize: "13px", color: T.grey3, cursor: "pointer",
              }} title="Force the saved-example path so you can show the fallback on stage">
                <input
                  type="checkbox"
                  checked={simulateOffline}
                  onChange={(e) => setSimulateOffline(e.target.checked)}
                  style={{ accentColor: T.royal }}
                />
                Simulate offline (show fallback)
              </label>
            </div>

            {isSample && (
              <div style={{
                marginTop: "12px", fontFamily: T.body, fontSize: "13px", color: T.royal,
              }}>
                Cascade Ridge sample loaded. Click Extract Clauses to analyze. Liability Cap is intentionally absent.
              </div>
            )}

            {/* Privacy line */}
            <div style={{
              marginTop: "20px", fontFamily: T.body, fontSize: "13px", color: T.grey3,
            }}>
              Contract text is sent to the AI provider for analysis and is not stored by ClauseLens.
              This demo uses a fictional contract. Do not paste a real, sensitive contract into a public tool.
            </div>

            {/* Disclaimer */}
            <div style={{
              marginTop: "28px", borderTop: `1px solid ${T.hair}`, paddingTop: "20px",
              fontFamily: T.body, fontSize: "13px", lineHeight: "1.8", color: T.grey2,
            }}>
              <div style={{ ...sectionLabel, marginBottom: "8px" }}>Legal Disclaimer</div>
              <p style={{ margin: "0 0 8px 0" }}>
                ClauseLens is an AI-assisted research tool intended to help users <em>locate</em> contract language for initial review. It is <strong>not a substitute for qualified legal counsel</strong> and does not constitute legal advice.
              </p>
              <p style={{ margin: "0 0 8px 0" }}>
                AI extraction may be incomplete, imprecise, or incorrect. Clauses marked "Not Found" may still exist in forms the model did not recognize. Always verify extracted text against the original document before acting on it.
              </p>
              <p style={{ margin: 0 }}>
                Do not upload documents containing confidential information without appropriate authorization. By using this tool you acknowledge that all outputs require human review before any legal or business reliance.
              </p>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: T.display, fontSize: "22px", fontWeight: "800", color: T.ink }}>Extraction Complete</div>
                {fileName && <div style={{ fontSize: "13px", color: T.grey3, fontFamily: T.body }}>{fileName}</div>}
              </div>
              <button onClick={reset} style={{
                background: T.white, border: `1px solid ${T.hair}`, color: T.royal,
                borderRadius: "6px", padding: "8px 16px", fontSize: "12px",
                fontFamily: T.display, fontWeight: "700", cursor: "pointer",
                letterSpacing: "0.05em", textTransform: "uppercase",
              }}>New Analysis</button>
            </div>

            {usedFallback && (
              <div style={{
                background: "rgba(199,60,47,0.1)", border: `1px solid ${T.brick}`,
                borderRadius: "6px", padding: "10px 14px", color: "#8f2b22",
                fontFamily: T.body, fontSize: "14px", marginBottom: "20px",
              }}>
                Showing a saved example result for the Cascade Ridge sample. Live AI was unavailable, so the demo keeps going.
              </div>
            )}

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "15px", border: `1px solid ${T.hair}`, borderRadius: "8px", overflow: "hidden" }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${T.royal}`, background: T.panel }}>
                  <th style={{
                    textAlign: "left", padding: "12px 16px", color: T.royal,
                    fontFamily: T.display, fontSize: "12px",
                    letterSpacing: "0.08em", textTransform: "uppercase", width: "150px", fontWeight: "700",
                  }}>Clause</th>
                  <th style={{
                    textAlign: "left", padding: "12px 16px", color: T.royal,
                    fontFamily: T.display, fontSize: "12px",
                    letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: "700",
                  }}>Extracted Text</th>
                  <th style={{ width: "100px" }}></th>
                </tr>
              </thead>
              <tbody>
                {CLAUSES.map((clause, i) => (
                  <ClauseRow
                    key={clause}
                    clause={clause}
                    value={results[clause] || "Not Found."}
                    contractText={contractText}
                    rowIndex={i}
                  />
                ))}
              </tbody>
            </table>

            <div style={{
              marginTop: "32px", borderTop: `1px solid ${T.hair}`, paddingTop: "24px",
            }}>
              <ROIPanel />
            </div>

            <div style={{
              marginTop: "28px", fontFamily: T.mono, fontSize: "12px", color: T.grey3, lineHeight: "1.8",
            }}>
              <div style={{ ...sectionLabel, marginBottom: "6px", fontFamily: T.display }}>Build Log</div>
              v1 · Initial extraction table, PDF/DOCX upload, drag and drop, paste input<br />
              v2 · Improved error surfacing, increased token limit, DOCX exception handling<br />
              v3 · Per-clause Edit (inline Save/Cancel) plus AI Explanation panel<br />
              v4 · Legal disclaimer and interactive ROI calculator<br />
              v5 · Model call moved server side (key in server env only), Study Groups skin<br />
              v6 · Client-side PDF text extraction, gated results table, Load Sample and scripted fallback<br />
              <span style={{ color: T.grey2 }}>Mobile now works: the browser calls a serverless function, not the API directly.</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
