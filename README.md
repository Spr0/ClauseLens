# ClauseLens — AI Contract Clause Extractor

> *A PM learning exercise that became a working tool.*

ClauseLens is a single-page React app that uses the Anthropic Claude API to extract five key clauses from any contract — Term, Payment, Termination, Liability Cap, and Indemnity — in under two minutes. Built as a hands-on exploration of AI-powered product development from a product manager's perspective.

---

## Live Demo

> Deploy via [Vercel](https://vercel.com) or [Netlify](https://netlify.com) — see Setup below.

---

## What It Does

- **Upload or paste** a contract (PDF, DOCX, or plain text)
- **Extracts 5 key clauses** via Claude API — returns "Not Found." when a clause is genuinely absent
- **Edit any result** inline — Save/Cancel without leaving the page
- **Explain any result** — a second AI call explains *why* that text was chosen, in plain language
- **ROI calculator** — adjustable hourly rate and contract volume, shows monthly and annual time value
- **Legal disclaimer** — surfaced before extraction, not buried in a footer

---

## Why I Built This

I'm a senior transformation leader exploring how AI accelerates knowledge work. This project was deliberately chosen because contract review is a high-frequency, high-cost task in legal, finance, and operations teams — exactly the kind of workflow where a well-scoped AI tool creates measurable value.

The goal wasn't to build a perfect legal tool. It was to:
- Understand the full stack from prompt engineering through UI
- Experience the debugging loop firsthand (see Build Log below)
- Develop an intuition for where AI adds value vs. where human review is non-negotiable

---

## Architecture

```
User Input (paste / PDF / DOCX)
        ↓
  File Processing
  ├── PDF → base64 → Anthropic document API
  └── DOCX → Mammoth.js → plain text → Anthropic messages API
        ↓
  Claude API (claude-haiku)
  ├── Extraction call → JSON with 5 clause keys
  └── Explanation call → plain-language rationale per clause
        ↓
  React state → editable results table → ROI panel
```

**Key decisions:**
- PDFs sent as base64 documents (Claude reads natively — no text extraction needed)
- DOCX converted via Mammoth.js (Claude API doesn't natively parse Word format)
- Extraction prompt returns strict JSON — `regex` match used as fallback if model wraps in markdown fences
- Explanation is a separate prompt with a different system role — avoids contaminating extraction output

---

## Build Log

| Version | What changed | Why |
|---------|-------------|-----|
| v1 | Initial extraction table, PDF/DOCX upload, drag-and-drop | Core functionality first |
| v2 | Error surfacing, increased token limit, DOCX exception handling | Silent failures were masking real API errors |
| v3 | Per-clause Edit (inline Save/Cancel) + AI Explanation panel | Users need to correct and understand outputs, not just consume them |
| v4 | Legal disclaimer (input page) + interactive ROI calculator (results page) | Trust and business case are product requirements, not afterthoughts |

**Known issue resolved:** Early versions showed "Analysis failed: Invalid response format" on mobile. Root cause: the Claude.ai mobile artifact sandbox blocks outbound fetch to `api.anthropic.com`. Works correctly on desktop browsers.

---

## Setup

```bash
# Clone
git clone https://github.com/Spr0/clauselens.git
cd clauselens

# Install
npm create vite@latest . -- --template react
npm install mammoth

# Replace src/App.jsx with ClauseLens.jsx
# Run
npm run dev
```

> The Anthropic API key is injected automatically when running inside the Claude.ai artifact environment. For standalone deployment, add your key to a `.env` file and pass it via the `x-api-key` header.

---

## Product Decisions Worth Noting

**Disclaimer placement:** On the input page, not the results page. A disclaimer that appears after someone has already acted on AI output is a liability, not a safeguard.

**ROI framing:** The calculator assumes 25 min manual review vs. ~1.5 min with AI assistance. These are conservative benchmarks from legal ops literature. The point is not precision — it's to give a procurement conversation a number to anchor on.

**"Not Found" is a feature:** The tool explicitly surfaces absent clauses rather than hallucinating text. A false negative is recoverable. A false positive in a contract context is not.

**Edit before export (v3):** Users must be able to correct AI output in-context. Building a correction workflow signals that the tool is designed for responsible use, not blind trust.

---

## Stack

- **React** (via Vite)
- **Mammoth.js** — DOCX text extraction
- **Anthropic Claude API** — `claude-haiku-4-5` for extraction and explanation
- No backend — all processing client-side or via direct API call

---

## About

Built by **Scott Henderson** — enterprise transformation leader, VP Technology, renewable energy and beyond.

Exploring the developer ecosystem from a product perspective to build better intuition for AI-native tooling.

🌐 [hendersonsolution.com](https://hendersonsolution.com) · 📬 scott@hendersonsolution.com · [GitHub](https://github.com/Spr0)
