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
// is unavailable, so it must never drift (the regression test guards it).
export const CASCADE_RIDGE_RESULT = {
  Term: "This Agreement shall commence on the Effective Date and shall remain in effect until Subcontractor's work is finally completed and accepted, but in no event later than eighteen (18) months from the Effective Date.",
  Payment: "Contractor shall pay Subcontractor for work satisfactorily completed within thirty (30) days following Contractor's receipt of Subcontractor's approved monthly application for payment, with five percent (5%) retainage.",
  Termination: "Contractor may terminate for its convenience upon seven (7) days written notice, or for cause immediately if Subcontractor fails to cure a material default within three (3) days of written notice.",
  "Liability Cap": "Not Found.",
  Indemnity: "To the fullest extent permitted by law, Subcontractor shall indemnify, defend, and hold harmless Contractor and the Owner, but only to the extent caused by the negligent acts or omissions of the Subcontractor.",
};
