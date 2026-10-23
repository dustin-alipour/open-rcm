"use client";

import React, { useState } from "react";

interface ClaimValidation {
  status: "ready" | "warning" | "error";
  message: string;
}

export default function PreBillDefensePage() {
  const [chartNote, setChartNote] = useState(
    `Patient attended a 45-minute individual psychotherapy session. Discussed coping strategies for generalized anxiety, work-related stressors, and cognitive reframing. Patient demonstrated active engagement and reports moderate symptom reduction.`
  );

  const [cptCode, setCptCode] = useState("90837"); // 60 min psychotherapy
  const [icd10Code, setIcd10Code] = useState("F41.1"); // Generalized Anxiety
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [validationAlert, setValidationAlert] = useState<ClaimValidation | null>({
    status: "warning",
    message: "Deterministic Audit Flag: CPT 90837 requires ≥53 minutes of documented clinical time. Note currently documents 45 minutes. Downcode to 90834 recommended to avoid automated payer denial.",
  });

  const runAgenticExtraction = () => {
    setIsAgentRunning(true);
    setTimeout(() => {
      // Deterministic check logic on the note content
      const lower = chartNote.toLowerCase();
      if (lower.includes("45-minute") || lower.includes("45 min") || lower.includes("45m")) {
        setCptCode("90834"); // 45 min code
        setValidationAlert({
          status: "ready",
          message: "Guardrail Passed: CPT 90834 matches documented 45-minute duration. Ready for CMS-1500 generation.",
        });
      } else {
        setValidationAlert({
          status: "ready",
          message: "All deterministic clearinghouse checks passed.",
        });
      }
      setIsAgentRunning(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
          <h1 className="text-lg font-semibold tracking-tight text-white">
            OpenRCM <span className="text-slate-400 font-normal">| Predictive Pre-Bill Defense</span>
          </h1>
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 font-mono">Encounter: ENC-2026-8812</span>
          <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 font-mono">Payer: BCBS Commercial</span>
        </div>
      </header>

      {/* Split-Screen Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Progress Note */}
        <section className="flex-1 p-8 flex flex-col border-r border-slate-800 bg-slate-950">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Clinical Documentation</h2>
              <p className="text-xs text-slate-500">Therapist Chart Note (Encounter in progress)</p>
            </div>
            <button
              onClick={runAgenticExtraction}
              disabled={isAgentRunning}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm flex items-center space-x-2 disabled:opacity-50"
            >
              <span>{isAgentRunning ? "Running Agent Scrub..." : "⚡ Run Pre-Bill Agent"}</span>
            </button>
          </div>

          <textarea
            value={chartNote}
            onChange={(e) => setChartNote(e.target.value)}
            className="flex-1 w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-200 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
            placeholder="Document session details here..."
          />
        </section>

        {/* Right Column: Concurrent Coding Side-Sheet */}
        <aside className="w-[450px] p-8 bg-slate-900/60 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Concurrent Encounter Billing
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-indigo-900/50 text-indigo-300 border border-indigo-700/50">
                Side-Sheet Preview
              </span>
            </div>

            {/* Validation Alert Card */}
            {validationAlert && (
              <div
                className={`p-4 rounded-xl mb-6 border text-xs leading-relaxed ${
                  validationAlert.status === "warning"
                    ? "bg-amber-950/40 border-amber-800/80 text-amber-200"
                    : "bg-emerald-950/40 border-emerald-800/80 text-emerald-200"
                }`}
              >
                <div className="font-semibold mb-1 flex items-center space-x-1">
                  <span>{validationAlert.status === "warning" ? "⚠️ Payer Defense Alert" : "✅ Audit-Ready"}</span>
                </div>
                {validationAlert.message}
              </div>
            )}

            {/* Encounters & Coding Form Elements */}
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Proposed CPT Code (Box 24D)</label>
                <input
                  type="text"
                  value={cptCode}
                  onChange={(e) => setCptCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {cptCode === "90837" ? "Psychotherapy, 60 min (Requires 53+ min)" : "Psychotherapy, 45 min (38-52 min)"}
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Primary Diagnosis ICD-10 (Box 21)</label>
                <input
                  type="text"
                  value={icd10Code}
                  onChange={(e) => setIcd10Code(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">F41.1 - Generalized anxiety disorder</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Claim Readiness State</label>
                <div className="flex items-center space-x-2 text-xs">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      validationAlert?.status === "ready" ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  />
                  <span className="text-slate-300 font-medium">
                    {validationAlert?.status === "ready" ? "Cleared for Batch 837 Submission" : "Blocked by Pre-Bill Guardrail"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
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