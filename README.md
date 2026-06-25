# ClauseLens, AI Contract Clause Extractor

> *A PM learning exercise that became a working tool.*

ClauseLens is a single-page React app that uses the Anthropic Claude API to extract five key clauses from any contract (Term, Payment, Termination, Liability Cap, and Indemnity) in under two minutes. Built as a hands-on exploration of AI-powered product development from a product manager's perspective.

Part of the Study Groups demo suite, and skinned to match it.

---

## Live Demo

>🔗 **[clauselens.netlify.app](https://clauselens.netlify.app)**

---

## What It Does

- **Upload or paste** a contract (PDF, DOCX, or plain text)
- **Extracts 5 key clauses** via Claude, and returns "Not Found." when a clause is genuinely absent
- **Never shows a false table.** Failed or empty input shows an error, not a page of "Not Found"
- **Edit any result** inline, with Save/Cancel, without leaving the page
- **Explain any result.** A second AI call explains why that text was chosen, in plain language
- **Load Sample** loads the Cascade Ridge subcontract, and a scripted fallback keeps the demo alive if the API is unavailable
- **ROI calculator** with adjustable hourly rate and contract volume
- **Legal disclaimer and privacy line** surfaced before extraction, not buried in a footer

---

## Architecture

```
User Input (paste / PDF / DOCX)
        |
  Text extraction (all client side)
  |-- PDF  -> pdf.js text layer -> plain text
  |-- DOCX -> Mammoth.js        -> plain text
  |-- paste                     -> plain text
        |
  POST /api/analyze  (Netlify Function, server side)
  |-- holds ANTHROPIC_API_KEY, calls Claude
  |-- validates payload, caps size, rate limits, sanitizes errors
  |-- extract call     -> JSON with 5 clause keys
  |-- explain call     -> plain-language rationale per clause
        |
  React state -> gated results table -> ROI panel
```

**Key decisions:**
- **The model call runs server side.** The browser calls our own Netlify Function, which holds the key in server env (`ANTHROPIC_API_KEY`). The key never reaches the client, the bundle, or any response. This also fixes the old mobile limitation, since the browser no longer calls api.anthropic.com directly.
- **PDF and DOCX text is extracted in the browser** (pdf.js and Mammoth.js), then sent as plain text, exactly like the paste path. Image-only or scanned PDFs have no text layer, so the app detects that and asks for OCR or a paste instead of sending empty text.
- **The results table is gated.** It renders only when non-empty text was sent and a valid structured response came back. The parse and gate logic lives in one shared module (`src/lib/extraction.js`) used by both the function and the client, and is unit-tested.
- **No contract text is stored or logged**, anywhere. Processed in memory, returned, discarded.
- **The model id comes from `ANTHROPIC_MODEL`** in the environment, with no hardcoded default.

---

## Build Log

| Version | What changed | Why |
|---------|-------------|-----|
| v1 | Initial extraction table, PDF/DOCX upload, drag-and-drop | Core functionality first |
| v2 | Error surfacing, increased token limit, DOCX exception handling | Silent failures were masking real API errors |
| v3 | Per-clause Edit (inline Save/Cancel) plus AI Explanation panel | Users need to correct and understand outputs, not just consume them |
| v4 | Legal disclaimer (input page) plus interactive ROI calculator | Trust and business case are product requirements, not afterthoughts |
| v5 | Model call moved into a Netlify Function (key server side only), Study Groups skin | Security and brand alignment for the owner demo |
| v6 | Client-side PDF text extraction, gated results table, Load Sample and scripted fallback | Fix the broken upload path, kill the false "Not Found" table, make the live demo reliable |

**Resolved:** earlier builds showed "Analysis failed" on mobile because the Claude mobile sandbox blocked the browser's outbound fetch to api.anthropic.com. Moving the call into a serverless function removes that block.

---

## Setup

```bash
# Clone
git clone https://github.com/Spr0/ClauseLens.git
cd ClauseLens

# Install
npm install

# Configure server env (never use a VITE_ prefix for the key)
cp env.example .env
# edit .env: set ANTHROPIC_API_KEY and ANTHROPIC_MODEL

# Run locally (Netlify dev serves the function + the Vite app)
netlify dev

# Run the tests
npm test
```

For production on Netlify, set `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, and optionally `ALLOWED_ORIGIN` in the site's environment variables. Never commit a key.

---

## Product Decisions Worth Noting

**"Not Found" is a feature.** The tool surfaces absent clauses rather than hallucinating text. A false negative is recoverable. A false positive in a contract is not. The corollary: when extraction does not run, the app shows an error, never a confident table of "Not Found."

**Disclaimer placement:** on the input page, not the results page. A disclaimer that appears after someone has already acted on AI output is a liability, not a safeguard.

**Privacy, said plainly:** contract text is sent to the AI provider for analysis and is not stored by ClauseLens. The demo uses a fictional contract on purpose, you should not paste a real, sensitive contract into a public tool. In an owner's own deployment, this would run inside their own tenant so the data stays in their building.

**Edit before export.** Users must be able to correct AI output in context. Building a correction workflow signals that the tool is designed for responsible use, not blind trust.

---

## Stack

- **React** (via Vite)
- **pdf.js** for PDF text extraction, **Mammoth.js** for DOCX
- **Netlify Functions** for the server-side Anthropic call
- **Anthropic Claude API** for extraction and explanation
- **Vitest** for the clause-parsing and gating tests

---

## About

Built by **Scott Henderson**, enterprise transformation leader, VP Technology, renewable energy and beyond.

Exploring the developer ecosystem from a product perspective to build better intuition for AI-native tooling.

🌐 [hendersonsolution.com](https://hendersonsolution.com) · 📬 scott@hendersonsolution.com · [GitHub](https://github.com/Spr0)
