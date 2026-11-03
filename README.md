# OpenRCM | Pre-Bill Defense Engine

An open-source prototype designed to eliminate outpatient behavioral health claim denials and audit clawbacks before submission. 

OpenRCM pairs LLM-powered clinical extraction with deterministic CMS clearinghouse rules to identify coding discrepancies, enforce minimum time thresholds, and provide human-in-the-loop remediation.

---

## The Problem: Downcode & Clawback Risk in Outpatient Billing

In outpatient psychotherapy billing, time-based CPT codes (e.g., 90832, 90834, 90837) are strictly governed by CMS and commercial payer time minimums:
* CPT 90837 requires a minimum of 53 documented minutes.
* CPT 90834 covers encounters between 38 and 52 documented minutes.
* CPT 90832 covers encounters between 16 and 37 documented minutes.
* Encounters under 16 minutes fall below the billable psychotherapy threshold.

When clinicians select 90837 for a 45-minute session, clearinghouses flag the claim or commercial payers claw back reimbursement during post-payment audits, creating revenue leakage and administrative overhead.

---

## Architectural Approach

Rather than allowing a probabilistic LLM to make direct compliance and billing decisions, OpenRCM decouples extraction from adjudication:

1. Server-Side De-Identification & Guardrails:
   * Redacts common PHI/PII patterns before requests leave the server.
   * Clamps payload size to prevent compute drain.
   * Encapsulates raw input in XML tags to guard against prompt injection.

2. Structured Extraction (Claude + Zod):
   * Extracts session duration, modality, and clinical interventions.
   * Enforces a strict JSON schema contract to eliminate conversational filler.
   * Returns a confidence score for extraction quality.

3. Deterministic Payer Engine (TypeScript):
   * Hard-coded CMS and commercial time rules calculate audit readiness.
   * Quantifies downcoding risk and revenue variance.
   * Provides 1-click human-in-the-loop remediation before ANSI X12 837P clearinghouse queuing.

---

## Tech Stack

* Framework: Next.js (App Router, TypeScript)
* Styling: Tailwind CSS
* Extraction: Anthropic Claude API (@anthropic-ai/sdk)
* Contract Validation: Zod
* Deployment: Vercel

---

## Getting Started

### Prerequisites
* Node.js 18+
* An Anthropic API key

### Local Setup

1. Clone the repository:
   git clone https://github.com/dustin-alipour/open-rcm.git
   cd open-rcm

2. Install dependencies:
   npm install

3. Configure environment variables:
   Create a .env.local file in the root directory:
   ANTHROPIC_API_KEY=your_anthropic_api_key_here

4. Run the local development server:
   npm run dev

Open http://localhost:3000 to view the application.

---

## License

MIT