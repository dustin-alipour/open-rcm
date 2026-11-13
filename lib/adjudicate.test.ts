import { describe, it, expect } from "vitest";
import { adjudicate, type ExtractedFacts } from "./adjudicate";

// A complete, valid set of facts. Each test overrides only what it cares about.
const base: ExtractedFacts = {
  documentedMinutes: 55,
  modality: "individual",
  clinicalInterventions: ["cognitive reframing"],
  symptomsDocumented: ["generalized anxiety"],
  extractionConfidence: 90,
};

describe("adjudicate: 90837 time rules", () => {
  it("passes 90837 with 55 minutes", () => {
    const r = adjudicate(base, "90837");
    expect(r.status).toBe("ready");
    expect(r.recommendedCpt).toBe("90837");
    expect(r.financialRiskDelta).toBe(0);
  });

  it("passes 90837 at exactly 53 minutes (boundary)", () => {
    expect(adjudicate({ ...base, documentedMinutes: 53 }, "90837").status).toBe("ready");
  });

  it("downcodes 90837 to 90834 at 52 minutes (boundary)", () => {
    const r = adjudicate({ ...base, documentedMinutes: 52 }, "90837");
    expect(r.status).toBe("warning");
    expect(r.recommendedCpt).toBe("90834");
  });

  it("downcodes 90837 to 90834 at 45 minutes", () => {
    const r = adjudicate({ ...base, documentedMinutes: 45 }, "90837");
    expect(r.recommendedCpt).toBe("90834");
    expect(r.financialRiskDelta).toBe(42);
  });

  it("keeps 90834 as the downcode at 38 minutes (lower boundary)", () => {
    expect(adjudicate({ ...base, documentedMinutes: 38 }, "90837").recommendedCpt).toBe("90834");
  });

  it("downcodes 90837 to 90832 at 37 minutes (boundary)", () => {
    const r = adjudicate({ ...base, documentedMinutes: 37 }, "90837");
    expect(r.recommendedCpt).toBe("90832");
    expect(r.financialRiskDelta).toBe(80);
  });

  it("downcodes 90837 to 90832 at 16 minutes (boundary)", () => {
    expect(adjudicate({ ...base, documentedMinutes: 16 }, "90837").recommendedCpt).toBe("90832");
  });

  it("hard stops below 16 minutes", () => {
    const r = adjudicate({ ...base, documentedMinutes: 15 }, "90837");
    expect(r.status).toBe("error");
    expect(r.recommendedCpt).toBe("90837");
  });
});

describe("adjudicate: missing documentation", () => {
  it("warns when no duration is documented", () => {
    const r = adjudicate({ ...base, documentedMinutes: null }, "90837");
    expect(r.status).toBe("warning");
    expect(r.message).toContain("No explicit session duration");
  });

  it("warns when no symptoms are documented", () => {
    const r = adjudicate({ ...base, symptomsDocumented: [] }, "90837");
    expect(r.status).toBe("warning");
    expect(r.message).toContain("Medical Necessity");
  });

  it("warns when no interventions are documented", () => {
    const r = adjudicate({ ...base, clinicalInterventions: [] }, "90837");
    expect(r.status).toBe("warning");
  });
});

describe("adjudicate: 90834 time rules", () => {
  it("passes 90834 with 45 minutes", () => {
    const r = adjudicate({ ...base, documentedMinutes: 45 }, "90834");
    expect(r.status).toBe("ready");
    expect(r.recommendedCpt).toBe("90834");
  });

  it("passes 90834 at exactly 38 minutes (boundary)", () => {
    expect(adjudicate({ ...base, documentedMinutes: 38 }, "90834").status).toBe("ready");
  });

  it("downcodes 90834 to 90832 at 37 minutes (boundary)", () => {
    const r = adjudicate({ ...base, documentedMinutes: 37 }, "90834");
    expect(r.status).toBe("warning");
    expect(r.recommendedCpt).toBe("90832");
    expect(r.financialRiskDelta).toBe(38);
  });

  it("downcodes 90834 to 90832 at 16 minutes (boundary)", () => {
    expect(adjudicate({ ...base, documentedMinutes: 16 }, "90834").recommendedCpt).toBe("90832");
  });

  it("hard stops 90834 below 16 minutes", () => {
    const r = adjudicate({ ...base, documentedMinutes: 15 }, "90834");
    expect(r.status).toBe("error");
    expect(r.recommendedCpt).toBe("90834");
    expect(r.financialRiskDelta).toBe(113);
  });
});