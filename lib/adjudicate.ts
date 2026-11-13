// Deterministic payer rules. Pure function: no API calls, no randomness.
// Input is facts extracted from the note plus the CPT the clinician proposed.

export type AdjudicationStatus = "ready" | "warning" | "error";

export interface ExtractedFacts {
  documentedMinutes: number | null;
  modality: "individual" | "family" | "group" | "unknown";
  clinicalInterventions: string[];
  symptomsDocumented: string[];
  extractionConfidence: number;
}

export interface Adjudication {
  status: AdjudicationStatus;
  recommendedCpt: string;
  message: string;
  financialRiskDelta: number;
}

export function adjudicate(
  extracted: ExtractedFacts,
  proposedCpt: string
): Adjudication {
  let recommendedCpt = proposedCpt;
  let status: AdjudicationStatus = "ready";
  let message = "All deterministic clearinghouse checks passed.";
  let financialRiskDelta = 0;

  const mins = extracted.documentedMinutes;

  // Rule (not a model judgment): necessity counts as documented only if at
  // least one symptom AND one intervention were extracted.
  const necessityDocumented =
    extracted.symptomsDocumented.length > 0 &&
    extracted.clinicalInterventions.length > 0;

  if (mins === null) {
    status = "warning";
    message =
      "Deterministic Audit Flag: No explicit session duration found in note. Time-based psychotherapy codes (90832/90834/90837) require explicit minute documentation.";
    financialRiskDelta = 155;
  } else if (proposedCpt === "90837" && mins < 53) {
    if (mins >= 38) {
      recommendedCpt = "90834";
      status = "warning";
      financialRiskDelta = 42;
      message = `Deterministic Audit Flag: Proposed CPT 90837 requires ≥53 minutes. ${mins} documented minutes found. Auto-downcode to 90834 recommended to prevent clawback (Risk: -$${financialRiskDelta}).`;
    } else if (mins >= 16) {
      recommendedCpt = "90832";
      status = "warning";
      financialRiskDelta = 80;
      message = `Deterministic Audit Flag: Proposed CPT 90837 requires ≥53 minutes. ${mins} documented minutes found. Downcode to 90832 required.`;
    } else {
      status = "error";
      financialRiskDelta = 155;
      message = `Hard Stop: Documented duration (${mins} min) is below the 16-minute CMS minimum threshold for billable psychotherapy.`;
    }
  } else if (!necessityDocumented) {
    status = "warning";
    financialRiskDelta = 155;
    message =
      "Medical Necessity Alert: Note lacks documented symptoms or therapeutic interventions required by commercial payers.";
  } else {
    message = `Guardrail Passed: Documented ${mins} minutes and ${extracted.clinicalInterventions.length} intervention(s) satisfy criteria for CPT ${proposedCpt}.`;
  }

  return { status, recommendedCpt, message, financialRiskDelta };
}