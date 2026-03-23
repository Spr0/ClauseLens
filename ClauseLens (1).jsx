import { useState, useCallback } from "react";
import * as mammoth from "mammoth";

const CLAUSES = ["Term", "Payment", "Termination", "Liability Cap", "Indemnity"];

const SYSTEM_PROMPT = `You are a legal contract analyst. Extract specific clauses from contract text.
Return ONLY a valid JSON object with exactly these keys: "Term", "Payment", "Termination", "Liability Cap", "Indemnity".
For each key, provide the relevant extracted text from the contract. If a clause is not found, use the string "Not Found."
Be concise — extract the most relevant sentence(s) for each clause. Do not include preamble or explanation, only the JSON object.`;

const EXPLAIN_PROMPT = `You are a legal contract analyst. A user extracted a clause from a contract and wants to understand how you identified it.
Given the clause name, the extracted text, and the original contract, explain in 2-3 plain-language sentences:
1. Where in the contract you found this clause
2. Why this text was chosen as the most relevant excerpt
3. Any caveats or nuances the user should be aware of
Be concise and plain-language. Do not use legal jargon without explaining it.`;

async function callAPI(systemPrompt, userMessage) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }]
    })
  });

  let data;
  let rawText = "";
  try {
    rawText = await response.text();
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`Status ${response.status} — raw: ${rawText.slice(0, 300)}`);
  }

  if (!response.ok || data.error) {
    const msg = data.error?.message || JSON.stringify(data).slice(0, 300);
    throw new Error(`API ${response.status}: ${msg}`);
  }

  const text = data.content?.find(b => b.type === "text")?.text || "";
  if (!text) throw new Error("Empty response from API");
  return text;
}

function Spinner({ size = 14 }) {
  return (
    <>
      <span style={{
        display: "inline-block", width: size, height: size,
        border: "2px solid #555", borderTopColor: "#c9a84c",
        borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
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
        : "[PDF — text not available for explanation]";
      const result = await callAPI(EXPLAIN_PROMPT,
        `Clause: ${clause}\nExtracted text: ${savedValue}\n\nContract excerpt:\n${contractSnippet}`);
      setExplanation(result);
    } catch (err) {
      setExplainError(`Explanation failed: ${err.message}`);
    } finally {
      setExplainLoading(false);
    }
  };

  const btnBase = {
    border: "1px solid #2e2e42", borderRadius: "3px", padding: "4px 10px",
    fontSize: "11px", fontFamily: "system-ui, sans-serif", cursor: "pointer", letterSpacing: "0.5px",
  };

  return (
    <>
      <tr style={{
        borderBottom: showExplanation ? "none" : "1px solid #1e1e2e",
        background: rowIndex % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
      }}>
        <td style={{
          padding: "16px", color: "#e8d898", fontWeight: "600", verticalAlign: "top",
          whiteSpace: "nowrap", fontFamily: "system-ui, sans-serif", fontSize: "13px", width: "140px"
        }}>{clause}</td>

        <td style={{ padding: "16px", verticalAlign: "top" }}>
          {editing ? (
            <div>
              <textarea
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                autoFocus
                style={{
                  width: "100%", minHeight: "80px", background: "#13141f",
                  border: "1px solid #c9a84c", borderRadius: "4px", color: "#d8d0c0",
                  fontFamily: "system-ui, sans-serif", fontSize: "13px", lineHeight: "1.6",
                  padding: "10px", resize: "vertical", outline: "none",
                  boxSizing: "border-box", marginBottom: "8px"
                }}
              />
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={handleSave} style={{
                  ...btnBase, background: "#c9a84c", color: "#0f1117", border: "none", fontWeight: "600"
                }}>Save</button>
                <button onClick={handleCancel} style={{
                  ...btnBase, background: "transparent", color: "#8880a0"
                }}>Cancel</button>
              </div>
            </div>
          ) : (
            <span style={{
              color: notFound ? "#55505a" : "#c8c0b0", lineHeight: "1.7",
              fontStyle: notFound ? "italic" : "normal",
              fontFamily: notFound ? "system-ui, sans-serif" : "Georgia, serif",
              fontSize: "14px", display: "block", marginBottom: "4px"
            }}>{savedValue}</span>
          )}
        </td>

        <td style={{ padding: "16px 16px 16px 0", verticalAlign: "top", whiteSpace: "nowrap" }}>
          {!editing && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end" }}>
              <button onClick={() => setEditing(true)} style={{
                ...btnBase, background: "transparent", color: "#8890c0"
              }}>✏️ Edit</button>
              <button onClick={handleExplain} style={{
                ...btnBase,
                background: showExplanation ? "rgba(201,168,76,0.15)" : "transparent",
                color: "#c9a84c",
                borderColor: showExplanation ? "#c9a84c" : "#2e2e42",
                display: "flex", alignItems: "center", gap: "5px"
              }}>
                {explainLoading ? <><Spinner size={10} />Asking…</> : "🔍 Explain"}
              </button>
            </div>
          )}
        </td>
      </tr>

      {showExplanation && (
        <tr style={{ borderBottom: "1px solid #1e1e2e" }}>
          <td colSpan={3} style={{ padding: "0 16px 16px 16px" }}>
            <div style={{
              background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)",
              borderRadius: "4px", padding: "14px 16px", fontFamily: "system-ui, sans-serif",
              fontSize: "13px", lineHeight: "1.7", color: "#b8b0a0"
            }}>
              {explainLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#6b6880" }}>
                  <Spinner size={12} /> Generating explanation…
                </div>
              ) : explainError ? (
                <span style={{ color: "#e08080", wordBreak: "break-word" }}>{explainError}</span>
              ) : (
                <>
                  <div style={{
                    color: "#c9a84c", fontSize: "11px", letterSpacing: "1.5px",
                    textTransform: "uppercase", marginBottom: "8px", fontWeight: "600"
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
    background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)",
    borderRadius: "6px", padding: "16px 20px", flex: "1", minWidth: "120px"
  };
  const labelStyle = {
    fontFamily: "system-ui, sans-serif", fontSize: "10px", letterSpacing: "1.5px",
    textTransform: "uppercase", color: "#6b6040", marginBottom: "6px"
  };
  const valueStyle = {
    fontFamily: "system-ui, sans-serif", fontSize: "22px", fontWeight: "700", color: "#c9a84c"
  };
  const subStyle = {
    fontFamily: "system-ui, sans-serif", fontSize: "11px", color: "#4a4858", marginTop: "2px"
  };
  const inputStyle = {
    background: "#13141f", border: "1px solid #2e2e42", borderRadius: "3px",
    color: "#d8d0c0", fontFamily: "system-ui, sans-serif", fontSize: "13px",
    padding: "5px 10px", width: "80px", outline: "none", textAlign: "right"
  };

  return (
    <div>
      <div style={{
        fontFamily: "system-ui, sans-serif", fontSize: "10px", letterSpacing: "1.5px",
        textTransform: "uppercase", color: "#6b6040", fontWeight: "600", marginBottom: "16px"
      }}>Time Saved · ROI Estimate</div>

      {/* Assumptions */}
      <div style={{
        display: "flex", gap: "20px", flexWrap: "wrap", marginBottom: "20px",
        fontFamily: "system-ui, sans-serif", fontSize: "13px", color: "#7a7088", alignItems: "center"
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
        <div style={{ color: "#3e3a4a", fontSize: "12px" }}>
          Assumes 25 min manual · ~1.5 min with AI
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
          <div style={subStyle}>{contracts} contracts · {totalSavedHours.toFixed(1)} hrs freed</div>
        </div>
        <div style={statStyle}>
          <div style={labelStyle}>Monthly Value</div>
          <div style={valueStyle}>${totalSavedDollars.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div style={subStyle}>at ${rate}/hr loaded cost</div>
        </div>
        <div style={{ ...statStyle, border: "1px solid rgba(201,168,76,0.35)", background: "rgba(201,168,76,0.1)" }}>
          <div style={labelStyle}>Annual Value</div>
          <div style={{ ...valueStyle, fontSize: "26px" }}>${annualSavedDollars.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div style={subStyle}>{annualSavedHours.toFixed(0)} hrs · {annualContracts} contracts/yr</div>
        </div>
      </div>

      <div style={{
        marginTop: "12px", fontFamily: "system-ui, sans-serif", fontSize: "11px",
        color: "#3a3848", fontStyle: "italic"
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

  const processFile = useCallback(async (file) => {
    setFileName(file.name);
    setError(null);
    if (file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result.split(",")[1];
        setContractText({ type: "pdf", base64, mediaType: "application/pdf" });
      };
      reader.readAsDataURL(file);
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

  const analyze = async () => {
    if (!contractText) return;
    setLoading(true); setError(null); setResults(null);
    try {
      const userMessage = typeof contractText === "object" && contractText.type === "pdf"
        ? "Extract the 5 key clauses from this contract as instructed."
        : `Extract the 5 key clauses from this contract:\n\n${contractText}`;
      const text = await callAPI(SYSTEM_PROMPT, userMessage);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error(`No JSON in response: ${text.slice(0, 200)}`);
      setResults(JSON.parse(jsonMatch[0]));
    } catch (err) {
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setContractText(""); setResults(null); setError(null); setFileName(null); };
  const hasText = typeof contractText === "string" ? contractText.trim().length > 0 : !!contractText;

  return (
    <div style={{ minHeight: "100vh", background: "#0f1117", fontFamily: "'Georgia', 'Times New Roman', serif", color: "#e8e0d0" }}>
      <div style={{
        borderBottom: "1px solid #2a2a3a", padding: "28px 40px 24px",
        background: "linear-gradient(to bottom, #13141f, #0f1117)"
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
          <span style={{ fontSize: "26px", fontWeight: "700", letterSpacing: "-0.5px", color: "#f0e8d0" }}>ClauseLens</span>
          <span style={{
            fontSize: "11px", letterSpacing: "3px", color: "#c9a84c",
            textTransform: "uppercase", fontFamily: "system-ui, sans-serif", fontWeight: "500"
          }}>Contract Intelligence</span>
        </div>
        <div style={{ fontSize: "13px", color: "#6b6880", marginTop: "4px", fontFamily: "system-ui, sans-serif" }}>
          Extract key clauses instantly — Term · Payment · Termination · Liability Cap · Indemnity
        </div>
      </div>

      <div style={{ padding: "36px 40px", maxWidth: "900px" }}>
        {!results ? (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input").click()}
              style={{
                border: `1.5px dashed ${dragOver ? "#c9a84c" : "#2e2e42"}`,
                borderRadius: "6px", padding: "24px", textAlign: "center", marginBottom: "20px",
                cursor: "pointer", transition: "border-color 0.2s, background 0.2s",
                background: dragOver ? "rgba(201,168,76,0.05)" : "rgba(255,255,255,0.02)",
              }}
            >
              <input id="file-input" type="file" accept=".pdf,.docx" style={{ display: "none" }} onChange={handleFileInput} />
              <div style={{ fontSize: "28px", marginBottom: "8px" }}>📄</div>
              {fileName ? (
                <div style={{ color: "#c9a84c", fontFamily: "system-ui, sans-serif", fontSize: "14px" }}>✓ {fileName}</div>
              ) : (
                <>
                  <div style={{ color: "#a09898", fontFamily: "system-ui, sans-serif", fontSize: "14px" }}>Drop a PDF or DOCX here, or click to browse</div>
                  <div style={{ color: "#555", fontFamily: "system-ui, sans-serif", fontSize: "12px", marginTop: "4px" }}>or paste contract text below</div>
                </>
              )}
            </div>

            {(!fileName || typeof contractText === "string") && (
              <textarea
                value={typeof contractText === "string" ? contractText : ""}
                onChange={(e) => { setContractText(e.target.value); setFileName(null); }}
                placeholder="Paste contract text here…"
                style={{
                  width: "100%", minHeight: "220px", background: "#13141f",
                  border: "1px solid #2a2a3a", borderRadius: "6px", color: "#d8d0c0",
                  fontFamily: "system-ui, sans-serif", fontSize: "13px", lineHeight: "1.7",
                  padding: "16px", resize: "vertical", outline: "none",
                  boxSizing: "border-box", marginBottom: "20px"
                }}
                onFocus={(e) => e.target.style.borderColor = "#c9a84c"}
                onBlur={(e) => e.target.style.borderColor = "#2a2a3a"}
              />
            )}

            {error && (
              <div style={{
                background: "rgba(180,60,60,0.15)", border: "1px solid #6b2a2a",
                borderRadius: "4px", padding: "12px 16px", color: "#e08080",
                fontFamily: "system-ui, sans-serif", fontSize: "13px",
                marginBottom: "20px", wordBreak: "break-word"
              }}>{error}</div>
            )}

            <button onClick={analyze} disabled={!hasText || loading} style={{
              background: hasText && !loading ? "#c9a84c" : "#2a2a3a",
              color: hasText && !loading ? "#0f1117" : "#555",
              border: "none", borderRadius: "4px", padding: "13px 32px",
              fontSize: "14px", fontFamily: "system-ui, sans-serif", fontWeight: "600",
              cursor: hasText && !loading ? "pointer" : "not-allowed",
              letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "10px"
            }}>
              {loading ? <><Spinner /> Analyzing contract…</> : "Extract Clauses"}
            </button>

            {/* Disclaimer */}
            <div style={{
              marginTop: "36px", borderTop: "1px solid #1e1e2e", paddingTop: "20px",
              fontFamily: "system-ui, sans-serif", fontSize: "12px", lineHeight: "1.8", color: "#4a4858"
            }}>
              <div style={{
                color: "#7a6a3a", fontSize: "10px", letterSpacing: "1.5px",
                textTransform: "uppercase", fontWeight: "600", marginBottom: "8px"
              }}>Legal Disclaimer</div>
              <p style={{ margin: "0 0 8px 0" }}>
                ClauseLens is an AI-assisted research tool intended to help users <em style={{ color: "#5a5468" }}>locate</em> contract language for initial review. It is <strong style={{ color: "#6a6478", fontWeight: "600" }}>not a substitute for qualified legal counsel</strong> and does not constitute legal advice.
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
                <div style={{ fontSize: "18px", color: "#f0e8d0", marginBottom: "2px" }}>Extraction Complete</div>
                {fileName && <div style={{ fontSize: "12px", color: "#6b6880", fontFamily: "system-ui, sans-serif" }}>{fileName}</div>}
              </div>
              <button onClick={reset} style={{
                background: "transparent", border: "1px solid #2e2e42", color: "#8880a0",
                borderRadius: "4px", padding: "7px 16px", fontSize: "12px",
                fontFamily: "system-ui, sans-serif", cursor: "pointer",
                letterSpacing: "1px", textTransform: "uppercase"
              }}>New Analysis</button>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #c9a84c" }}>
                  <th style={{
                    textAlign: "left", padding: "10px 16px", color: "#c9a84c",
                    fontFamily: "system-ui, sans-serif", fontSize: "11px",
                    letterSpacing: "2px", textTransform: "uppercase", width: "140px", fontWeight: "600"
                  }}>Clause</th>
                  <th style={{
                    textAlign: "left", padding: "10px 16px", color: "#c9a84c",
                    fontFamily: "system-ui, sans-serif", fontSize: "11px",
                    letterSpacing: "2px", textTransform: "uppercase", fontWeight: "600"
                  }}>Extracted Text</th>
                  <th style={{ width: "90px" }}></th>
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
              marginTop: "32px", borderTop: "1px solid #1e1e2e", paddingTop: "24px"
            }}>
              <ROIPanel />
            </div>

            <div style={{
              fontFamily: "system-ui, sans-serif", fontSize: "12px", color: "#3e3e52", lineHeight: "1.8"
            }}>
              <div style={{ color: "#4e4e62", marginBottom: "6px", letterSpacing: "1px", textTransform: "uppercase", fontSize: "10px" }}>
                Build Log
              </div>
              v1 · Initial extraction table — PDF/DOCX upload, drag-and-drop, paste input<br />
              v2 · Improved error surfacing, increased token limit, DOCX exception handling<br />
              v3 · Per-clause Edit (inline Save/Cancel) + AI Explanation panel<br />
              <span style={{ color: "#2a2a3e" }}>⚠ Known: API calls require desktop browser — mobile sandbox blocks outbound fetch to api.anthropic.com</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
