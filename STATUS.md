# ClauseLens — Status

_Last updated: 2026-06-30_

Live demo of the **"Own it"** rung in the Study Groups kit: a prompt standardized
into a tool a team owns, where a named person signs every output.

- **Repo:** github.com/Spr0/ClauseLens · **Deploy:** clauselens.netlify.app
- **Stack:** React + Vite, one Netlify Function, client-side PDF extraction. No localStorage, no auth.

## Build spec status (`ClauseLens_Build_Spec.md`) — done and verified

- **Shared, config-driven modules** (built to drop verbatim into the RFI drafter and
  Submittal checker later; each holds all three apps' config, selected via `appKey`):
  - `src/shared/roi.jsx` + `roi.css` — two-part ROI: kit score (Value × Frequency) and the
    operational ROI formula. Pure `computeROI` is unit-tested.
  - `src/shared/signoff.jsx` + `signoff.css` — sign-off gate: Export/Copy/Print disabled until
    Name + Role + attestation; signature line appended on export.
- **Review pipeline:** the Netlify Function returns `{ clauses: [{name, quote, plain, status}], raise: [...] }`.
  The report shows one card per clause with a status chip, the quote in mono, and an inline plain
  restatement, followed by a "Raise before signing" list (missing Liability Cap is the headline).
- **Inputs:** PDF, DOCX, TXT, and paste.

### Verified
14/14 tests · clean build · no API key in the bundle · real PDF extracts and a corrupt PDF shows a
clear error (no silent failure) · ROI math correct ($12k base, $132k with risk term) · sign-off gate
enables only after name + role + attestation and appends the signature line.

## Conformed to `@sg/core` canonical sign-off (2026-06-30)

The Study Groups platform (`Spr0/Study-Groups`) now holds the canonical ROI + sign-off in `@sg/core`.
ClauseLens conforms by behaviour and copy (it keeps its own React modules for now):
- Sign-off line softened to the canonical block, internal approval rather than a signature:
  `Reviewed and approved by {name}, {role}, on {date}. Drafted with AI assistance; approved by the named reviewer before issue.`
  (no more "verified by a person").
- `appKey` values lowercased to `clauselens` / `rfi` / `submittal` to match the canonical config keys.
- A later pass can replace the local `src/shared/*.jsx` with a `@sg/core` import.

## Deliberate deviations from the spec (intentional, do not re-flag)

1. **PDF extraction stays client-side** (pdf.js), not a `/api/extract` function. Verified working.
2. **Shared modules are `.jsx`, not `.js`** — they contain JSX, which Vite requires the `.jsx`
   extension for. Still byte-identical across the three apps.
3. The old on-demand **"Explain"** round-trip was removed, superseded by the inline plain restatement.

## Standing conventions (all of Scott's apps)

Model always from `process.env.ANTHROPIC_MODEL`, no hardcoded fallback (fail loudly) · no em dashes in
UI copy · contact header `Bellingham, WA` · whole-file rewrites over patches · never rename localStorage keys.

## Open / not done

- Spec §8: drop the same `src/shared/` modules into the RFI drafter (studygroupsdemo.netlify.app) and
  the Submittal checker (studygroups-submittal.netlify.app), changing only the per-app config. Those
  repos are not checked out locally yet.

## Local dev note

node/npm are not on PATH here; node 20 lives at `~/.localnode/node-v20.20.2-darwin-arm64/bin`.
