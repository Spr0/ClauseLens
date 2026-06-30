// =============================================================================
// SHARED MODULE B: sign-off block
// =============================================================================
// The "Own it" rule made literal: a named person signs every output. Identical
// across ClauseLens, the RFI drafter, and the Submittal checker. Only the
// attestation line (SIGNOFF_CONFIGS) differs per app; the gating mechanism is
// the same everywhere. Keep this file (and signoff.css) byte-identical across
// the three apps.
//
// Export, Copy, and Print are disabled until the user enters a Name and Role
// and ticks the attestation box. Name and role live in component state only and
// are never sent anywhere. On enable, a sign-off line is appended to the
// exported text.
// =============================================================================

import { useState } from "react";
import "./signoff.css";

export const SIGNOFF_CONFIGS = {
  ClauseLens: {
    attestation:
      "I verified the quotes against the contract and confirmed each Not Found by searching the document myself.",
  },
  RFI: {
    attestation:
      "I checked the cited references and confirmed the question and suggested resolution.",
  },
  Submittal: {
    attestation:
      "I confirmed each deviation against the spec section and that no compliance is claimed the spec does not support.",
  },
};

function todayLong() {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function signatureLine(name, role) {
  return `Reviewed and approved by ${name}, ${role}, on ${todayLong()}. Drafted with AI assistance; verified by a person.`;
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Print without relying on a popup window (which blockers may suppress): write
// the signed text into a hidden iframe and print that.
function printText(text) {
  const frame = document.createElement("iframe");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentWindow.document;
  doc.open();
  doc.write(
    `<pre style="font-family:'Spectral',Georgia,serif;font-size:13px;line-height:1.6;white-space:pre-wrap;padding:24px;">${text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")}</pre>`
  );
  doc.close();
  frame.contentWindow.focus();
  frame.contentWindow.print();
  setTimeout(() => document.body.removeChild(frame), 1000);
}

export function SignOff({ appKey, buildExportText, filename = "clauselens-review.txt" }) {
  const config = SIGNOFF_CONFIGS[appKey] || SIGNOFF_CONFIGS.ClauseLens;

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [attested, setAttested] = useState(false);
  const [copied, setCopied] = useState(false);

  const enabled = name.trim().length > 0 && role.trim().length > 0 && attested;

  // The full signed output: the report text plus the sign-off line.
  const signedText = () =>
    `${buildExportText()}\n\n${signatureLine(name.trim(), role.trim())}`;

  const onExport = () => downloadText(filename, signedText());
  const onPrint = () => printText(signedText());
  const onCopy = async () => {
    const text = signedText();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API can be blocked; fall back to a hidden textarea.
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="kit-signoff" aria-label="Sign-off">
      <h3 className="kit-signoff-title">Sign off before export</h3>
      <p className="kit-signoff-lede">
        No output leaves this tool unsigned. Enter your name and role and confirm the attestation to
        enable Export, Copy, and Print.
      </p>

      <div className="kit-signoff-fields">
        <label className="kit-signoff-field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </label>
        <label className="kit-signoff-field">
          <span>Role</span>
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Your role" />
        </label>
      </div>

      <label className="kit-signoff-attest">
        <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} />
        <span>{config.attestation}</span>
      </label>

      <div className="kit-signoff-actions">
        <button type="button" className="kit-signoff-btn kit-signoff-btn-primary"
          disabled={!enabled} onClick={onExport}>Export</button>
        <button type="button" className="kit-signoff-btn"
          disabled={!enabled} onClick={onCopy}>{copied ? "Copied" : "Copy"}</button>
        <button type="button" className="kit-signoff-btn"
          disabled={!enabled} onClick={onPrint}>Print</button>
        {!enabled && (
          <span className="kit-signoff-hint">Name, role, and attestation required.</span>
        )}
      </div>
    </section>
  );
}
