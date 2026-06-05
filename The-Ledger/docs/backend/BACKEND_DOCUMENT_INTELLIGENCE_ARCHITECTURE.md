# THE LEDGER — BACKEND DOCUMENT & AI PROCESSING ARCHITECTURE

Version: 2.0
Status: AUTHORITATIVE
Date: June 4, 2026
Authority: Backend Architecture Refinement Pass

---

## CHANGE LOG

| Version | Date | Changes |
|---|---|---|
| 1.0 | June 4, 2026 | Initial document intelligence boundary definition |
| 2.0 | June 4, 2026 | Refinement pass: AI Limitations Covenant added; processing pipeline stages defined; security boundaries expanded; approval doctrine section added; financial mutation restriction section added |

---

## PURPOSE

This document defines the architectural boundaries for document intelligence and AI-assisted processing in The Ledger. This is a forward-looking architectural boundary definition, not an implementation plan.

No vendors are selected. No implementations are designed. Only the boundaries, ownership, event interactions, and explicit AI constraints are defined.

---

## CURRENT STATE

The Ledger's frontend prototype includes document workflows (photo uploads, expense receipts, QA images). These are currently stored as file references without processing.

The platform does NOT currently include:
- OCR or text extraction
- Receipt or invoice parsing
- Document classification
- AI-assisted review recommendations
- QA image analysis

These are future capabilities. The architecture must define where they live without blocking current implementation.

---

## AI LIMITATIONS COVENANT

The following is an absolute, non-negotiable covenant governing all AI-assisted processing in The Ledger. No future implementation, vendor selection, or capability expansion may override these constraints.

### AI Systems in The Ledger MAY:

- Extract structured data from uploaded documents (text, amounts, dates, vendor names)
- Classify document type (receipt, invoice, QA image, site photo, delivery note, contract)
- Surface extracted data as labelled suggestions to human reviewers
- Flag potential discrepancies for human attention (e.g. extracted amount differs from submitted amount)
- Provide confidence scores on extracted data
- Assist reviewers with contextual information — never replace them
- Generate advisory text summaries of document contents

### AI Systems in The Ledger MAY NEVER:

- **Approve any submission** — Approval is a human action. Absolute invariant. No exception.
- **Create approved financial records** — Financial records are created only as a consequence of explicit human approval.
- **Reject any submission automatically** — Rejection is a human action. AI may flag; it may never reject.
- **Override a reviewer's decision** — AI suggestions are advisory. The reviewer's decision is final.
- **Bypass the Review Centre** — All submissions enter the Review Centre for human review. AI processing occurs before or alongside human review, never instead of it.
- **Bypass the Approval Doctrine** — The Approval Doctrine is absolute. AI processing never creates a path around it.
- **Modify the content of a submission** — Submission content is set by the submitter and is immutable. AI may annotate; it may not change.
- **Write to financial, operational, or audit schemas** — AI outputs are stored only in the `document_intelligence` schema.
- **Retain or share company data with AI providers** — All AI processing is subject to data isolation and contractual non-retention requirements.

**The Review Centre remains the mandatory gateway. AI is an assistant to the reviewer, not a replacement for the reviewer.**

---

## DOCUMENT INTELLIGENCE BOUNDED CONTEXT

Document Intelligence is a distinct bounded context that operates as an **advisory input** to existing bounded contexts.

**Future bounded context name:** Document Intelligence Context

**Module name (when built):** `document-intelligence` module

This module is not part of v1 backend implementation. The architecture reserves its boundaries.

---

## PROCESSING PIPELINE STAGES

Document Intelligence processing follows a defined pipeline. Each stage is atomic and independently auditable.

```
Stage 1: INTAKE
  Document uploaded by worker or PM
  File reference stored by owning module (Review Centre)
  DocumentUploadedEvent published
  ↓

Stage 2: CLASSIFICATION QUEUE
  Document Intelligence Module consumes DocumentUploadedEvent
  Processing job created (document_intelligence.processing_jobs, status: queued)
  ↓

Stage 3: CLASSIFICATION
  Document type identified (receipt, invoice, QA image, site photo, delivery note)
  Classification result stored (advisory, with confidence score)
  DocumentClassified event published
  ↓

Stage 4: EXTRACTION
  Structured data extracted based on document type:
    - Receipt: amount, currency, vendor, date, line items
    - Invoice: invoice number, total, line items, due date, vendor
    - QA image: no structured extraction; passed to visual analysis
    - Site photo: no structured extraction; stored as visual context
  Extraction results stored (document_intelligence.extraction_results, advisory)
  ↓

Stage 5: DISCREPANCY DETECTION
  Extracted values compared with submitted values
  e.g. Extracted receipt amount vs. submitted expense amount
  If discrepancy exceeds threshold: ExtractionFlagRaised event published
  ↓

Stage 6: ENRICHMENT DELIVERY
  DocumentProcessingCompleted event published with extraction results
  Review Centre Module subscribes and enriches the submission view
  Reviewer sees suggestions labelled "Extracted — Advisory Only"
  ↓

Stage 7: REVIEWER ACTION (human)
  Reviewer reads suggestions (optional — suggestions do not block approval)
  Reviewer makes approval or rejection decision (human action, no AI involvement)
  Reviewer action triggers audit entry (no AI suggestion audit, only reviewer decision audit)
```

### Pipeline Failure Handling

If any stage fails:
- Processing job status → `failed`
- `DocumentProcessingFailed` event published
- No blocking effect on the Review Centre — submission remains fully approachable
- Alert created for platform monitoring (non-critical)
- Failure is logged and observable but does not delay human review

**AI processing failure never blocks human approval.** The Review Centre does not depend on AI enrichment.

---

## ARCHITECTURAL BOUNDARIES

### Boundary 1 — Document Storage Boundary

Uploaded documents are stored in cloud object storage, managed by the core infrastructure. Document Intelligence consumes file references; it does not own the storage.

File ownership remains with the module that accepted the upload:
- Report photos → owned by Review Centre Module
- Expense receipts → owned by Review Centre Module
- QA images → owned by Review Centre Module

Document Intelligence module receives file references for processing, not custody.

### Boundary 2 — Processing Boundary

Document processing is fully asynchronous. It never blocks the submission intake path or the approval path.

The reviewer does not need to wait for AI processing to complete before reviewing or approving a submission.

### Boundary 3 — Data Boundary

Document Intelligence writes only to its own schema (`document_intelligence`):
- `document_intelligence.processing_jobs` — job lifecycle (queued → processing → completed → failed)
- `document_intelligence.classification_results` — document type, confidence score (advisory)
- `document_intelligence.extraction_results` — extracted fields, confidence scores (advisory)
- `document_intelligence.discrepancy_flags` — detected discrepancies (advisory)

Document Intelligence **never** writes to:
- `review` schema (submissions)
- `financial` schema (financial records)
- `audit` schema (audit trail)
- `operational` schema
- Any other module's schema

Results are projected into the Review Centre view through an event consumer and a read model in the Review Centre Module. This read model is explicitly advisory — it does not affect the approval flow.

### Boundary 4 — Approval Boundary

The approval boundary is absolute:

```
Document Intelligence provides: suggestions (advisory, labelled)
Review Centre provides: approval or rejection (human decision)

These are separate, non-overlapping responsibilities.
AI extraction results do not change the approval workflow.
AI extraction results do not pre-populate approval decisions.
AI extraction results do not prevent approval.
AI extraction results do not require approval acknowledgement.
```

A reviewer may approve, reject, or correct a submission without reading or acting on any AI suggestion. AI suggestions are supplementary context, never prerequisites.

### Boundary 5 — AI Provider Boundary

AI processing providers (OCR engines, LLMs, classification models) are infrastructure adapters:

```
Document Intelligence Module
  ↓ (via interface)
DocumentProcessingAdapter interface
  ↓
[Future provider implementation]
  - AWS Textract adapter
  - Google Document AI adapter
  - Azure Form Recognizer adapter
  - Custom OCR adapter
```

The Document Intelligence Module depends on the `DocumentProcessingAdapter` interface, not on any specific provider. Provider selection is an infrastructure concern.

The adapter interface enforces:
- Tenant data isolation (documents are processed in tenant-scoped contexts)
- No cross-tenant data in AI calls
- No document content retained in provider memory

### Boundary 6 — Security Boundary

Document processing involves potentially sensitive data. Security requirements:

**Tenant Isolation:**
- Documents are processed within the same tenant context; all results are scoped to `company_id`
- No document from Company A is ever included in an AI call made in the context of Company B
- Document storage paths are namespaced by `company_id` — no path guessing is possible

**Data Residency:**
- Processing results are stored only in The Ledger's own infrastructure (`document_intelligence` schema)
- AI provider calls are made with the minimum data required for processing only

**Provider Contractual Requirements:**
- AI providers must contractually agree to not retain document content after processing
- Providers must contractually agree to not use document content for model training
- Provider contracts are evaluated before any AI provider is integrated

**Access Control:**
- AI processing results (suggestions) are visible only to reviewers (CEO, PM) during the review process
- Workers never see AI processing results
- Client portal users never see AI processing results
- AI suggestions are not included in any document distributed to clients

**Financial Data in Documents:**
- Expense receipts may contain financial amounts
- These amounts are extracted and compared with submitted values — they are never used to create financial records
- The extracted amount is a suggestion to the reviewer, not an approved financial value

---

## EVENT INTERACTIONS

### Events Consumed by Document Intelligence Module (future)

| Event | Source | Action |
|---|---|---|
| `ReportSubmitted` | Review Centre | Queue classification and extraction for attached photos |
| `ExpenseSubmitted` | Review Centre | Queue classification and extraction for attached receipt |
| `DocumentUploadedEvent` | Any module | Queue classification and extraction |

### Events Produced by Document Intelligence Module (future)

| Event | Consumers | Description |
|---|---|---|
| `DocumentProcessingCompleted` | Review Centre | All extraction results available for reviewer view enrichment |
| `DocumentClassified` | Review Centre | Document type identified (advisory) |
| `ExtractionFlagRaised` | Review Centre, Intelligence (alert) | Discrepancy detected between extracted and submitted values (advisory) |
| `DocumentProcessingFailed` | Intelligence & Automation | Processing error — no blocking effect; alert only |

---

## FINANCIAL MUTATION RESTRICTIONS

Document Intelligence is absolutely prohibited from any financial mutation path:

| Action | Status |
|---|---|
| Create TimesheetEntry | **FORBIDDEN** |
| Create ExpenseEntry | **FORBIDDEN** |
| Create InventoryMutation | **FORBIDDEN** |
| Create InvoiceLineItem | **FORBIDDEN** |
| Contribute to PayrollRecord | **FORBIDDEN** |
| Create VoidRecord | **FORBIDDEN** |
| Create AdjustmentRecord | **FORBIDDEN** |
| Modify any financial record | **FORBIDDEN** |
| Approve any submission | **FORBIDDEN** |
| Reject any submission | **FORBIDDEN** |
| Write to `financial` schema | **FORBIDDEN** |
| Write to `review` schema | **FORBIDDEN** |
| Write to `audit` schema | **FORBIDDEN** |

These restrictions are enforced at the architectural boundary (the module's public API surface exposes no financial mutation methods) and at the database level (the `document_intelligence` database role has no write permissions on any schema other than `document_intelligence`).

---

## PROCESSING OWNERSHIP

| Concern | Owner |
|---|---|
| File storage | Core Infrastructure (cloud object storage) |
| File references and metadata | Module that accepted the upload |
| Processing pipeline | Document Intelligence Module |
| Classification results | Document Intelligence Module (own schema, advisory) |
| Extraction results | Document Intelligence Module (own schema, advisory) |
| Discrepancy flags | Document Intelligence Module (own schema, advisory) |
| Suggestion presentation in Review Centre | Review Centre Module (read model enrichment from events) |
| AI provider API calls | Document Intelligence Module infrastructure adapter |
| Audit of reviewer decisions | Review Centre Module (audit on approval/rejection, not on AI suggestion display) |
| Audit of processing events | Document Intelligence Module (processing job audit only) |

---

## IMPLEMENTATION PHASE

Document Intelligence is not part of v1 backend implementation.

It is defined here to ensure:
1. The core architecture does not close off the capability
2. The module boundary is known so no current module is designed in a way that prevents future integration
3. The event interactions are pre-defined so future integration requires no breaking changes to existing modules
4. The AI Limitations Covenant is established before any implementation begins

When Document Intelligence is implemented, it is added as an additional module within the modular monolith (or as a separately deployed service if processing volume warrants isolation).

**Pre-implementation requirements:**
- AI provider contracted with data isolation and non-retention clauses
- Security review of provider integration completed
- AI Limitations Covenant reviewed and confirmed as implemented
- Legal review of data residency requirements for target markets
