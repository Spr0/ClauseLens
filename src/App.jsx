import { useState, useCallback } from "react";
import * as mammoth from "mammoth";
import { extractPdfText, ScannedPdfError } from "./lib/pdf";
import { isValidResult, STATUS_NOT_FOUND } from "./lib/extraction.js";
import { CASCADE_RIDGE_TEXT, CASCADE_RIDGE_RESULT } from "./lib/sampleContract.js";
import { ROICalculator } from "./shared/roi.jsx";
import { SignOff } from "./shared/signoff.jsx";

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

// The browser never talks to api.anthropic.com directly. It calls our own
// serverless function, which holds the key in server env only.
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

async function analyzeContract(contractText) {
  const data = await postAnalyze({ contractText });
  return data.result;
}

// Serialize the report to plain text for export/copy/print. The sign-off line
// is appended by the SignOff module.
function buildExportText(results, fileName) {
  const lines = [];
  lines.push("ClauseLens Contract Review");
  lines.push(fileName ? `Source: ${fileName}` : "Source: pasted or sample contract");
  lines.push("");
  for (const c of results.clauses) {
    lines.push(`${c.name.toUpperCase()}  ·  ${c.status}`);
    lines.push(`"${c.quote}"`);
    if (c.plain) lines.push(`Plain: ${c.plain}`);
    lines.push("");
  }
  lines.push("RAISE BEFORE SIGNING");
  if (results.raise.length === 0) {
    lines.push("Nothing flagged.");
  } else {
    results.raise.forEach((r, i) => lines.push(`${i + 1}. ${r}`));
  }
  return lines.join("\n");
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

function StatusChip({ status }) {
  const notFound = status === STATUS_NOT_FOUND;
  return (
    <span style={{
      fontFamily: T.display, fontSize: "11px", fontWeight: "700",
      letterSpacing: "0.06em", textTransform: "uppercase",
      padding: "3px 10px", borderRadius: "20px", whiteSpace: "nowrap",
      color: T.white, background: notFound ? T.brick : T.royal,
    }}>{status}</span>
  );
}

function isAbsent(quote) {
  const q = (quote || "").trim();
  return !q || /^not\s+found\.?$/i.test(q);
}

function ClauseCard({ clause, onSaveQuote }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(clause.quote);

  const notFound = clause.status === STATUS_NOT_FOUND;

  const handleSave = () => { onSaveQuote(clause.name, editValue); setEditing(false); };
  const handleCancel = () => { setEditValue(clause.quote); setEditing(false); };

  const btnBase = {
    border: `1px solid ${T.hair}`, borderRadius: "5px", padding: "5px 12px",
    fontSize: "11px", fontFamily: T.display, fontWeight: "700", cursor: "pointer",
    letterSpacing: "0.05em", textTransform: "uppercase",
  };

  return (
    <div style={{
      border: `1px solid ${T.hair}`,
      borderLeft: `3px solid ${notFound ? T.brick : T.royal}`,
      borderRadius: "8px", padding: "16px 18px", marginBottom: "12px",
      background: T.white,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
        <span style={{
          fontFamily: T.display, fontSize: "15px", fontWeight: "700",
          letterSpacing: "0.04em", textTransform: "uppercase", color: T.ink,
        }}>{clause.name}</span>
        <StatusChip status={clause.status} />
        <span style={{ flex: 1 }} />
        {!editing && (
          <button onClick={() => { setEditValue(clause.quote); setEditing(true); }} style={{
            ...btnBase, background: T.white, color: T.royal,
          }}>Edit</button>
        )}
      </div>

      {editing ? (
        <div>
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            autoFocus
            style={{
              width: "100%", minHeight: "90px", background: T.white,
              border: `1px solid ${T.royal}`, borderRadius: "6px", color: T.ink,
              fontFamily: T.mono, fontSize: "13px", lineHeight: "1.6",
              padding: "10px", resize: "vertical", outline: "none",
              boxSizing: "border-box", marginBottom: "8px",
            }}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={handleSave} style={{ ...btnBase, background: T.royal, color: T.white, border: "none" }}>Save</button>
            <button onClick={handleCancel} style={{ ...btnBase, background: T.white, color: T.grey2 }}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div style={{
            fontFamily: T.mono, fontSize: "13px", lineHeight: "1.65",
            color: notFound ? T.grey3 : T.ink, fontStyle: notFound ? "italic" : "normal",
            background: T.panel, border: `1px solid ${T.hair}`, borderRadius: "6px",
            padding: "12px 14px", whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}>{clause.quote}</div>
          {clause.plain && (
            <div style={{
              marginTop: "10px", fontFamily: T.body, fontSize: "15px",
              lineHeight: "1.65", color: T.grey1,
            }}>
              <span style={{
                fontFamily: T.display, fontSize: "10px", fontWeight: "700",
                letterSpacing: "0.1em", textTransform: "uppercase", color: T.brick,
                marginRight: "8px",
              }}>Plain</span>
              {clause.plain}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RaiseList({ raise }) {
  return (
    <div style={{ marginTop: "28px" }}>
      <div style={{
        fontFamily: T.display, fontSize: "13px", letterSpacing: "0.05em",
        textTransform: "uppercase", color: T.ink, fontWeight: "700", marginBottom: "12px",
        paddingBottom: "4px", borderBottom: `2px solid ${T.hair}`,
      }}>Raise before signing</div>
      {raise.length === 0 ? (
        <div style={{ fontFamily: T.body, fontSize: "15px", color: T.grey3 }}>Nothing flagged.</div>
      ) : (
        <ol style={{ margin: 0, paddingLeft: "20px" }}>
          {raise.map((r, i) => (
            <li key={i} style={{
              fontFamily: T.body, fontSize: "15px", lineHeight: "1.65",
              color: i === 0 ? T.ink : T.grey1, marginBottom: "8px",
              fontWeight: i === 0 ? "600" : "400",
            }}>{r}</li>
          ))}
        </ol>
      )}
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
    const lower = file.name.toLowerCase();

    if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
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
      lower.endsWith(".docx")
    ) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        if (!result.value || result.value.trim().length === 0) {
          setFileName(null);
          setError("Could not extract text from this DOCX. Try pasting the text manually.");
        } else {
          setContractText(result.value);
        }
      } catch (e) {
        setFileName(null);
        setError(`Could not read this DOCX. Try pasting the contract text.`);
      }
    } else if (file.type === "text/plain" || lower.endsWith(".txt")) {
      try {
        const text = await file.text();
        if (!text || text.trim().length === 0) {
          setFileName(null);
          setError("That text file looks empty. Paste the contract text instead.");
        } else {
          setContractText(text);
        }
      } catch {
        setFileName(null);
        setError("Could not read this text file. Try pasting the contract text.");
      }
    } else {
      setFileName(null);
      setError("Please upload a PDF, DOCX, or TXT file, or paste the text.");
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
      const result = await analyzeContract(text);
      // Gate the report: only render on a valid, structured result.
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

  const updateClauseQuote = (name, newQuote) => {
    setResults((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        clauses: prev.clauses.map((c) =>
          c.name === name
            ? {
                ...c,
                quote: isAbsent(newQuote) ? "Not Found." : newQuote.trim(),
                plain: isAbsent(newQuote) ? "" : c.plain,
                status: isAbsent(newQuote) ? STATUS_NOT_FOUND : "Found",
              }
            : c
        ),
      };
    });
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
            <span style={{ ...sectionLabel, fontSize: "12px", letterSpacing: "0.18em" }}>Contract Clause Reviewer</span>
          </div>
          <div style={{ fontSize: "16px", color: T.grey2, marginTop: "6px", fontFamily: T.body }}>
            A first read for a person to verify · Term · Payment · Termination · Liability Cap · Indemnity
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
              <input id="file-input" type="file" accept=".pdf,.docx,.txt" style={{ display: "none" }} onChange={handleFileInput} />
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>📄</div>
              {fileName ? (
                <div style={{ color: T.royal, fontFamily: T.display, fontSize: "15px", fontWeight: "700" }}>✓ {fileName}</div>
              ) : (
                <>
                  <div style={{ color: T.ink, fontFamily: T.display, fontSize: "15px", fontWeight: "600" }}>Drop a PDF, DOCX, or TXT here, or click to browse</div>
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
                {loading ? <><Spinner /> Reviewing contract</> : "Review Clauses"}
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
                Cascade Ridge sample loaded. Click Review Clauses to analyze. Liability Cap is intentionally absent.
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
                <div style={{ fontFamily: T.display, fontSize: "22px", fontWeight: "800", color: T.ink }}>Clause Review</div>
                {fileName && <div style={{ fontSize: "13px", color: T.grey3, fontFamily: T.body }}>{fileName}</div>}
              </div>
              <button onClick={reset} style={{
                background: T.white, border: `1px solid ${T.hair}`, color: T.royal,
                borderRadius: "6px", padding: "8px 16px", fontSize: "12px",
                fontFamily: T.display, fontWeight: "700", cursor: "pointer",
                letterSpacing: "0.05em", textTransform: "uppercase",
              }}>New Review</button>
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

            {/* Clause cards */}
            <div>
              {results.clauses.map((clause) => (
                <ClauseCard key={clause.name} clause={clause} onSaveQuote={updateClauseQuote} />
              ))}
            </div>

            {/* Raise before signing */}
            <RaiseList raise={results.raise} />

            {/* ROI panel (shared module) */}
            <div style={{ marginTop: "32px", borderTop: `1px solid ${T.hair}`, paddingTop: "24px" }}>
              <ROICalculator appKey="ClauseLens" />
            </div>

            {/* Sign-off block (shared module). Gates Export/Copy/Print. */}
            <div style={{ marginTop: "28px" }}>
              <SignOff appKey="ClauseLens" buildExportText={() => buildExportText(results, fileName)} />
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
              v7 · Clause cards with inline plain restatement and status chips, Raise before signing list, TXT upload, shared ROI calculator, and the Own-it sign-off gate on Export, Copy, and Print<br />
              <span style={{ color: T.grey2 }}>No output leaves the tool unsigned: a named person signs every export.</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
