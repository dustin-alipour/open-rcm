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
            OpenRCM <span className="text-slate-400 font-normal">| Neuro-Symbolic Pre-Bill Defense</span>
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
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Clinical Documentation</h2>
              <p className="text-xs text-slate-500">Edit the note below (try changing minutes to 55 or 10) and run the agent</p>
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

          {/* Live Telemetry Panel: Displays Layer 2 Zod Output */}
          {extractedData && (
            <div className="mt-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
              <div className="text-slate-400 font-semibold uppercase tracking-wider mb-2 flex justify-between">
                <span>Layer 2 Telemetry: Zod-Constrained LLM Extraction</span>
                <span className="text-emerald-400 font-mono">Confidence: {extractedData.extractionConfidence}%</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-slate-300 font-mono">
                <div>
                  <span className="text-slate-500 block">Extracted Duration:</span>
                  {extractedData.documentedMinutes !== null ? `${extractedData.documentedMinutes} mins` : "None found"}
                </div>
                <div>
                  <span className="text-slate-500 block">Modality:</span>
                  {extractedData.modality}
                </div>
                <div>
                  <span className="text-slate-500 block">Interventions Found:</span>
                  {extractedData.clinicalInterventions.join(", ") || "None"}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Right Column: Concurrent Coding Side-Sheet */}
        <aside className="w-[450px] p-8 bg-slate-900/60 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Concurrent Encounter Billing
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-indigo-900/50 text-indigo-300 border border-indigo-700/50">
                Layer 3: Deterministic Engine
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
              disabled={validationAlert?.status !== "ready"}
              className="w-full py-2.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow"
            >
              Lock Encounter & Queue CMS-1500
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}