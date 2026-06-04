# THE LEDGER — BACKEND DOCUMENT & AI PROCESSING ARCHITECTURE

Version: 1.0
Status: AUTHORITATIVE
Date: June 4, 2026
Authority: Backend Architecture Definition Phase

---

## PURPOSE

This document defines the architectural boundaries for document intelligence and AI-assisted processing in The Ledger. This is a forward-looking architectural boundary definition, not an implementation plan.

No vendors are selected. No implementations are designed. Only the boundaries, ownership, and event interactions are defined.

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

## DOCUMENT INTELLIGENCE BOUNDED CONTEXT

Document Intelligence is a distinct bounded context that operates as an **advisory input** to existing bounded contexts. It never approves, mutates financial records, or bypasses the Review Centre.

**Future bounded context name:** Document Intelligence Context

**Module name (when built):** `document-intelligence` module

This module is not part of v1 backend implementation. The architecture reserves its boundaries.

---

## WHAT DOCUMENT INTELLIGENCE MAY DO

Document Intelligence is an advisory, enrichment-only capability:

- Extract structured data from uploaded documents (receipts, invoices, photos)
- Classify document type (receipt, invoice, QA image, site photo, delivery note)
- Surface extracted data as **suggestions** to the reviewer (PM or CEO) in the Review Centre
- Flag potential discrepancies (e.g. extracted amount differs from submitted expense amount)
- Assist reviewers with information; never replace them

---

## WHAT DOCUMENT INTELLIGENCE MAY NEVER DO

- Approve any submission (approval remains human-only, absolute invariant)
- Create financial records of any kind
- Reject any submission automatically
- Modify the content of a submission
- Bypass the Review Centre
- Write to any financial, operational, or audit schema

All extracted data is informational only. Reviewers choose whether to act on it.

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

Document processing is asynchronous:

```
Document uploaded → file reference stored → DocumentUploadedEvent published
  ↓
Document Intelligence Module consumes DocumentUploadedEvent
  ↓
Processing job queued (asynchronous)
  ↓
Extraction completes → DocumentProcessingCompleted event published (with extracted data)
  ↓
Review Centre Module consumes event → enriches submission view with suggestions
  ↓
Reviewer sees suggestions in Review Centre UI (informational only)
```

Processing occurs in a separate queue and worker to avoid blocking the submission intake path.

### Boundary 3 — Data Boundary

Document Intelligence writes only to its own schema (`document_intelligence`):
- Processing job records
- Extraction results (JSONB, advisory)
- Classification results (advisory)
- Confidence scores

Document Intelligence never writes to:
- `review` schema
- `financial` schema
- `audit` schema
- Any other module's schema

Results are projected into the Review Centre view through an event consumer and a read model in the Review Centre Module.

### Boundary 4 — AI Provider Boundary

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
  - Local OCR adapter
```

The Document Intelligence Module depends on the `DocumentProcessingAdapter` interface, not on any specific provider. Provider selection is an infrastructure concern.

### Boundary 5 — Security Boundary

Document processing may involve sensitive data (expense receipts showing amounts, client documents, site photos). Security requirements:

- Documents are processed within the same tenant context; extracted data is scoped to `company_id`
- Documents are not sent to AI providers in a form that exposes other tenants' data
- Extracted data is not retained by AI providers (contractual requirement, vendor-specific)
- Processing results are stored only in The Ledger's own infrastructure
- Workers and clients never see AI processing results — only reviewers (CEO, PM) see suggestions

---

## EVENT INTERACTIONS

### Events Consumed by Document Intelligence Module (future)

| Event | Source | Action |
|---|---|---|
| `ReportSubmitted` | Review Centre | Queue processing for attached photos |
| `ExpenseSubmitted` | Review Centre | Queue processing for attached receipt |
| `DocumentUploadedEvent` | Any module | Queue classification and extraction |

### Events Produced by Document Intelligence Module (future)

| Event | Consumers | Description |
|---|---|---|
| `DocumentProcessingCompleted` | Review Centre | Extraction results available for reviewer |
| `DocumentProcessingFailed` | Intelligence & Automation | Processing error (alert, no blocking effect) |
| `DocumentClassified` | Review Centre | Document type identified |
| `ExtractionFlagRaised` | Review Centre, Intelligence | Potential discrepancy detected (advisory) |

### Governance of AI Suggestions

All AI suggestions are labelled clearly as "Extracted — Advisory Only" in the Review Centre UI.

No suggestion is pre-populated into approval forms without explicit reviewer action.

No audit record is created for a suggestion being shown — only for reviewer actions taken in response to a suggestion.

---

## PROCESSING OWNERSHIP

| Concern | Owner |
|---|---|
| File storage | Core Infrastructure (cloud object storage) |
| File references and metadata | Module that accepted the upload |
| Processing jobs and queue | Document Intelligence Module |
| Extraction results | Document Intelligence Module (own schema) |
| Suggestion presentation | Review Centre Module (read model enrichment) |
| AI provider API calls | Document Intelligence Module infrastructure adapter |
| Audit of reviewer responses | Review Centre Module (audit on approval/rejection action) |

---

## IMPLEMENTATION PHASE

Document Intelligence is not part of v1 backend implementation.

It is defined here to ensure:
1. The core architecture does not close off the capability
2. The module boundary is known so no current module is designed in a way that prevents future integration
3. The event interactions are pre-defined so future integration requires no breaking changes to existing modules

When Document Intelligence is implemented, it is added as an additional module within the modular monolith (or as a separately deployed service if processing volume warrants it).
