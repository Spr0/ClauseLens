// The Cascade Ridge sample subcontract. Fictional, and deliberately missing a
// Liability Cap clause so the demo shows the "Not Found." signal honestly.
// Shared by the Load Sample button, the scripted demo fallback, and the
// regression test.
//
// Tied to the Study Groups demo universe: Cascade Ridge Construction building
// the Lakeview Medical Office.

export const CASCADE_RIDGE_NAME = "Cascade Ridge - Lakeview Medical Office Subcontract";

export const CASCADE_RIDGE_TEXT = `SUBCONTRACT AGREEMENT

This Subcontract Agreement ("Agreement") is entered into between Cascade Ridge Construction ("Contractor") and Summit Mechanical Services LLC ("Subcontractor") for work on the Lakeview Medical Office project located in Bellingham, WA.

1. SCOPE OF WORK
Subcontractor shall furnish all labor, materials, and equipment necessary to complete the HVAC and plumbing rough-in for the Lakeview Medical Office, in accordance with the Contract Documents and the project schedule.

2. TERM
This Agreement shall commence on the Effective Date and shall remain in effect until Subcontractor's work is finally completed and accepted, but in no event later than eighteen (18) months from the Effective Date, unless extended by written change order signed by both parties.

3. PAYMENT
Contractor shall pay Subcontractor for work satisfactorily completed within thirty (30) days following Contractor's receipt of Subcontractor's approved monthly application for payment. Contractor shall retain five percent (5%) of each progress payment as retainage, to be released within sixty (60) days of final acceptance.

4. TERMINATION
Contractor may terminate this Agreement, in whole or in part, for its convenience upon seven (7) days written notice to Subcontractor. Contractor may terminate for cause immediately if Subcontractor fails to cure a material default within three (3) days of written notice. Upon termination, Subcontractor shall be paid for work properly performed through the date of termination.

5. INSURANCE
Subcontractor shall maintain commercial general liability insurance with limits of not less than $1,000,000 per occurrence and shall name Contractor as an additional insured.

6. INDEMNIFICATION
To the fullest extent permitted by law, Subcontractor shall indemnify, defend, and hold harmless Contractor and the Owner from and against any claims, damages, losses, and expenses, including reasonable attorneys' fees, arising out of or resulting from the performance of the Subcontractor's work, but only to the extent caused by the negligent acts or omissions of the Subcontractor.

7. GOVERNING LAW
This Agreement shall be governed by the laws of the State of Washington.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date.`;

// The canonical, vetted extraction for the sample. Four clauses present, no
// Liability Cap. This is the cached result the demo falls back to when the API
// is unavailable, so it must never drift (the regression test guards it). The
// missing Liability Cap is surfaced as the headline item in the raise list.
export const CASCADE_RIDGE_RESULT = {
  clauses: [
    {
      name: "Term",
      quote:
        "This Agreement shall commence on the Effective Date and shall remain in effect until Subcontractor's work is finally completed and accepted, but in no event later than eighteen (18) months from the Effective Date.",
      plain:
        "The contract runs until the work is finished and accepted, and no later than 18 months from the start date.",
      status: "Found",
    },
    {
      name: "Payment",
      quote:
        "Contractor shall pay Subcontractor for work satisfactorily completed within thirty (30) days following Contractor's receipt of Subcontractor's approved monthly application for payment. Contractor shall retain five percent (5%) of each progress payment as retainage.",
      plain:
        "Payment is due within 30 days of an approved monthly invoice, with 5 percent held back as retainage until final acceptance.",
      status: "Found",
    },
    {
      name: "Termination",
      quote:
        "Contractor may terminate this Agreement, in whole or in part, for its convenience upon seven (7) days written notice to Subcontractor. Contractor may terminate for cause immediately if Subcontractor fails to cure a material default within three (3) days of written notice.",
      plain:
        "The Contractor can end the contract for convenience on 7 days notice, or immediately for cause if a default is not cured within 3 days.",
      status: "Found",
    },
    {
      name: "Liability Cap",
      quote: "Not Found.",
      plain: "",
      status: "Not Found",
    },
    {
      name: "Indemnity",
      quote:
        "To the fullest extent permitted by law, Subcontractor shall indemnify, defend, and hold harmless Contractor and the Owner from and against any claims, damages, losses, and expenses, including reasonable attorneys' fees, arising out of or resulting from the performance of the Subcontractor's work, but only to the extent caused by the negligent acts or omissions of the Subcontractor.",
      plain:
        "The Subcontractor covers the Contractor and Owner for claims caused by the Subcontractor's own negligence, but only to that extent.",
      status: "Found",
    },
  ],
  raise: [
    "No Liability Cap. The contract sets no ceiling on the Subcontractor's total liability, so exposure is open-ended. Raise this before signing.",
    "Indemnity runs one direction only. The Subcontractor indemnifies the Contractor and Owner, with no reciprocal protection for the Subcontractor.",
    "Termination for convenience favors the Contractor. Seven days notice with payment only for work performed leaves the Subcontractor little recourse.",
  ],
};
