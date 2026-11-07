"use client";

import React, { useState } from "react";

interface ClaimValidation {
  status: "ready" | "warning" | "error";
  message: string;
  recommendedCpt?: string;
  financialRiskDelta?: number;
}

interface ExtractedClinicalData {
  documentedMinutes: number | null;
  modality: string;
  clinicalInterventions: string[];
  medicalNecessitySupported: boolean;
  extractionConfidence: number;
}

export default function PreBillDefensePage() {
  const [chartNote, setChartNote] = useState(
    `Patient attended a 45-minute individual psychotherapy session. Discussed coping strategies for generalized anxiety, work-related stressors, and cognitive reframing. Patient demonstrated active engagement and reports moderate symptom reduction.`
  );

  const [cptCode, setCptCode] = useState("90837");
  const [icd10Code, setIcd10Code] = useState("F41.1");
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedClinicalData | null>(null);
  const [validationAlert, setValidationAlert] = useState<ClaimValidation | null>({
    status: "warning",
    message:
      "Click '⚡ Run Pre-Bill Agent' to parse clinical text via Claude Structured Outputs and validate against deterministic CMS/BCBS time rules.",
  });
  const [isClaimQueued, setIsClaimQueued] = useState(false);

  const SCENARIOS = [
    {
      label: "⚠️ 45-Min Downcode Risk",
      cpt: "90837",
      note: "Patient attended a 45-minute individual psychotherapy session. Discussed coping strategies for generalized anxiety, work-related stressors, and cognitive reframing. Patient demonstrated active engagement and reports moderate symptom reduction.",
    },
    {
      label: "✅ 55-Min Audit-Ready",
      cpt: "90837",
      note: "Patient participated in a 55-minute individual psychotherapy session targeting panic symptoms. Implemented cognitive restructuring exercises and established exposure hierarchy. Medical necessity explicitly supported.",
    },
    {
      label: "🛑 12-Min Clearinghouse Stop",
      cpt: "90837",
      note: "Brief 12-minute crisis triage and check-in with patient following acute workplace panic attack. Reviewed grounding techniques.",
    },
  ];

  const loadScenario = (scenario: typeof SCENARIOS[0]) => {
    setChartNote(scenario.note);
    setCptCode(scenario.cpt);
    setExtractedData(null);
    setValidationAlert({
      status: "warning",
      message: "Scenario loaded. Click '⚡ Run Pre-Bill Agent' to execute extraction and compliance checks.",
    });
    setIsClaimQueued(false);
  };

  const generateStedi837PJson = () => {
    const cleanIcd = icd10Code.replace(".", "");
    const fee = cptCode === "90837" ? "155.00" : cptCode === "90834" ? "113.00" : "75.00";

    return {
      controlNumber: "000000812",
      tradingPartnerServiceId: "BCBS01",
      submitter: {
        organizationName: "OPENRCM BEHAVIORAL HEALTH GROUP",
        contactInformation: { name: "BILLING DEPT", phoneNumber: "3035550199" },
      },
      receiver: { organizationName: "BLUE CROSS BLUE SHIELD" },
      subscriber: {
        memberId: "W998877665",
        paymentResponsibilityLevelCode: "P",
        firstName: "JANE",
        lastName: "DOE",
      },
      providers: [
        {
          providerType: "BillingProvider",
          npi: "1999999984",
          employerId: "841234567",
          organizationName: "OPENRCM BEHAVIORAL HEALTH GROUP",
          taxonomyCode: "101YM0800X", // Mental Health Counselor
        },
      ],
      claimInformation: {
        claimFilingCode: "CI", // Commercial Insurance
        patientControlNumber: "ENC-2026-8812",
        claimChargeAmount: fee,
        placeOfServiceCode: "11", // Office / Outpatient
        claimFrequencyCode: "1", // Original Claim (Box 22)
        signatureIndicator: "Y",
        planParticipationCode: "A",
        benefitsAssignmentCertificationIndicator: "Y",
        releaseInformationCode: "Y",
        healthCareCodeInformation: [
          {
            diagnosisTypeCode: "ABK", // Principal Diagnosis ICD-10-CM (Box 21)
            diagnosisCode: cleanIcd,
          },
        ],
        serviceLines: [
          {
            assignedNumber: "1",
            professionalService: {
              procedureIdentifier: "HC",
              procedureCode: cptCode, // Box 24D Verified CPT
              lineItemChargeAmount: fee,
              measurementUnit: "UN",
              serviceUnitCount: "1",
              compositeDiagnosisCodePointers: {
                diagnosisCodePointers: ["1"],
              },
            },
            serviceDate: "20261105",
            lineNoteText: `AUDITED_DURATION_${extractedData?.documentedMinutes ?? 0}_MIN_CONF_${extractedData?.extractionConfidence ?? 0}`,
          },
        ],
      },
    };
  };

  const runAgenticExtraction = async () => {
    setIsAgentRunning(true);
    try {
      const res = await fetch("/api/scrub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chartNote,
          proposedCpt: cptCode,
          proposedIcd10: icd10Code,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "API Error");

      setExtractedData(data.extracted);
      setValidationAlert(data.adjudication);
    } catch (err: any) {
      setValidationAlert({
        status: "error",
        message: `Agent Execution Error: ${err.message}`,
      });
    } finally {
      setIsAgentRunning(false);
    }
  };

  const applyRecommendedCpt = () => {
    if (validationAlert?.recommendedCpt) {
      const newCpt = validationAlert.recommendedCpt;
      setCptCode(newCpt);
      setValidationAlert({
        status: "ready",
        message: `Human-in-the-Loop Override Applied: Downcoded to CPT ${newCpt} (${extractedData?.documentedMinutes} mins documented). Claim cleared for ANSI X12 837P batching.`,
        recommendedCpt: newCpt,
        financialRiskDelta: 0,
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
          <h1 className="text-lg font-semibold tracking-tight text-white">
            OpenRCM <span className="text-slate-400 font-normal">| Pre-Bill Defense</span>
          </h1>
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 font-mono">Encounter: ENC-2026-8812</span>
          <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 font-mono">Payer: BCBS Commercial</span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Progress Note */}
        <section className="flex-1 p-8 flex flex-col border-r border-slate-800 bg-slate-950">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Clinical Documentation Scenarios
              </h2>
              <div className="flex items-center gap-2">
                {SCENARIOS.map((scen, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => loadScenario(scen)}
                    className="px-2.5 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  >
                    {scen.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={runAgenticExtraction}
              disabled={isAgentRunning}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm flex items-center space-x-2 disabled:opacity-50"
            >
              <span>{isAgentRunning ? "Parsing Note with Claude..." : "⚡ Run Pre-Bill Agent"}</span>
            </button>
          </div>

          <textarea
            value={chartNote}
            onChange={(e) => setChartNote(e.target.value)}
            className="flex-1 w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
            placeholder="Document session details here..."
          />

          {/* Live Telemetry Panel: Layer 2 Structural Contract */}
          <div className="mt-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <div className="text-slate-400 font-semibold uppercase tracking-wider mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    extractedData ? "bg-emerald-400" : isAgentRunning ? "bg-amber-400 animate-ping" : "bg-slate-600"
                  }`}
                />
                Schema Contract
              </span>
              <span className="text-slate-400 font-mono">
                {extractedData ? (
                  <span className="text-emerald-400 font-bold">Confidence: {extractedData.extractionConfidence}%</span>
                ) : isAgentRunning ? (
                  <span className="text-amber-400">Extracting...</span>
                ) : (
                  <span className="text-slate-600">Status: Awaiting Ingestion</span>
                )}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 font-mono">
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[11px] mb-1">Extracted Duration</span>
                <span className={extractedData ? "text-slate-200 font-bold" : "text-slate-600 italic"}>
                  {extractedData
                    ? extractedData.documentedMinutes !== null
                      ? `${extractedData.documentedMinutes} mins`
                      : "Missing from Note"
                    : "-- mins"}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[11px] mb-1">Parsed Modality</span>
                <span className={extractedData ? "text-slate-200 font-bold" : "text-slate-600 italic"}>
                  {extractedData ? extractedData.modality : "--"}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-500 block text-[11px] mb-1">Clinical Interventions</span>
                <span className={extractedData ? "text-slate-200 font-bold" : "text-slate-600 italic"}>
                  {extractedData ? extractedData.clinicalInterventions.join(", ") || "None extracted" : "--"}
                </span>
              </div>
            </div>
          </div>
          
        </section>

        {/* Right Column: Concurrent Coding Side-Sheet */}
        <aside className="w-[450px] p-8 bg-slate-900/60 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Concurrent Encounter Billing
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-indigo-900/50 text-indigo-300 border border-indigo-700/50">
                Deterministic Engine
              </span>
            </div>

            {validationAlert && (
              <div
                className={`p-4 rounded-xl mb-6 border text-xs leading-relaxed ${
                  validationAlert.status === "warning"
                    ? "bg-amber-950/40 border-amber-800/80 text-amber-200"
                    : validationAlert.status === "error"
                    ? "bg-rose-950/40 border-rose-800/80 text-rose-200"
                    : "bg-emerald-950/40 border-emerald-800/80 text-emerald-200"
                }`}
              >
                <div className="font-semibold mb-1 flex items-center justify-between">
                  <span>
                    {validationAlert.status === "warning"
                      ? "⚠️ Payer Defense Alert"
                      : validationAlert.status === "error"
                      ? "🛑 Hard Clearinghouse Stop"
                      : "✅ Audit-Ready"}
                  </span>
                  {validationAlert.financialRiskDelta ? (
                    <span className="font-mono text-amber-300">At Risk: $155.00</span>
                  ) : null}
                </div>
                <p>{validationAlert.message}</p>

                {validationAlert.recommendedCpt && validationAlert.recommendedCpt !== cptCode && (
                  <button
                    onClick={applyRecommendedCpt}
                    className="mt-3 w-full py-1.5 px-3 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-medium transition"
                  >
                    Accept 1-Click Fix: Downcode to {validationAlert.recommendedCpt}
                  </button>
                )}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Proposed CPT Code (Box 24D)</label>
                <input
                  type="text"
                  value={cptCode}
                  onChange={(e) => setCptCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Primary Diagnosis ICD-10 (Box 21)</label>
                <input
                  type="text"
                  value={icd10Code}
                  onChange={(e) => setIcd10Code(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800">
            <button
              disabled={validationAlert?.status !== "ready" || isClaimQueued}
              onClick={() => setIsClaimQueued(true)}
              className={`w-full py-2.5 text-xs font-semibold rounded-lg transition-all shadow ${
                isClaimQueued
                  ? "bg-slate-800 border border-emerald-500/50 text-emerald-300 cursor-default"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-30 disabled:cursor-not-allowed"
              }`}
            >
              {isClaimQueued
                ? "✓ Claim Locked & 837P JSON Generated"
                : "Lock Encounter & Generate 837P JSON"}
            </button>

            {isClaimQueued && (
              <div className="mt-3 rounded-lg bg-slate-950 border border-slate-800 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                    Clearinghouse Payload (837P JSON)
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    Status: Claim Locked (Immutable)
                  </span>
                </div>
                <pre className="text-[10px] font-mono text-slate-300 overflow-x-auto max-h-56 overflow-y-auto leading-relaxed">
                  {JSON.stringify(generateStedi837PJson(), null, 2)}
                </pre>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}