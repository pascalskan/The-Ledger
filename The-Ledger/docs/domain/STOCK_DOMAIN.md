# THE LEDGER — STOCK DOMAIN

## Frozen Domain Definition

Version: 1.0
Status: FROZEN
Date: June 4, 2026
Authority: Domain Definition Session — June 4, 2026

---

## STATUS

This document is the authoritative definition of the Stock Domain in The Ledger.

Every decision recorded here is final. Ambiguities raised in the Domain Definition Audit regarding stock ownership, stock locations, stock usage submission, approval requirements, and financial impact have been resolved.

This document supersedes any prior partial definitions, audit findings, or implementation assumptions regarding stock, inventory, and materials management.

Backend planning for the Stock Domain may begin from this document.

---

## WHAT IS STOCK?

Stock is company-owned inventory — physical items held by the company that are consumed or drawn upon in the course of performing work for clients.

Stock is NOT:
- A fixed company asset (a piece of equipment that is used and returned — see Asset Domain)
- A one-off purchase by a worker from a trade counter (that is an expense, category: `materials`)
- A client-owned item stored on-site (client assets are outside v1 scope)
- A vendor bill for bulk materials supply (vendor purchasing is outside v1 scope)

Examples of stock:
- Cleaning chemicals and consumables (bleach, detergent, microfibre cloths)
- Safety equipment consumables (gloves, masks, disposable suits)
- Maintenance consumables (light bulbs, fixings, lubricants, sealant)
- Security consumables (cable ties, tamper seals)
- Horticultural supplies (fertiliser, compost, grass seed)

Stock items are company-held and company-funded. When a worker uses stock on a job, the company's inventory level decreases and the cost is attributed to the job as a materials cost. The client may or may not be billed for materials depending on the job contract — but the internal cost is always recorded against the job.

---

## WHAT IS A STOCK ITEM?

A stock item is an entry in the company's stock catalogue representing one type of physical consumable or material.

### Stock Item Fields (Catalogue Record)

| Field | Type | Required | Notes |
|---|---|---|---|
| `stock_item_id` | UUID | System | Platform-generated |
| `company_id` | UUID | System | Multi-tenancy scoping |
| `name` | String | Always | Human-readable name (e.g., "Domestos Thick Bleach 750ml") |
| `sku` | String | Optional | Internal or supplier SKU code |
| `category` | Enum | Always | See Stock Categories below |
| `unit` | String | Always | Unit of measure (e.g., "litres", "units", "kg", "rolls") |
| `unit_cost` | Decimal | Always | Cost per unit in base currency (GBP in v1) |
| `reorder_threshold` | Integer | Optional | Quantity below which a restock alert is triggered |
| `status` | Enum | System | `active` \| `discontinued` |
| `created_at` | Timestamp | System | |
| `created_by` | User ID | System | |

### Stock Categories

| Category | Code | Covers |
|---|---|---|
| Cleaning Chemicals | `cleaning_chemicals` | Detergents, disinfectants, degreasers, bleach |
| Cleaning Consumables | `cleaning_consumables` | Cloths, mops, pads, bin bags, paper products |
| Safety Consumables | `safety_consumables` | Gloves, masks, PPE, first aid supplies |
| Maintenance Supplies | `maintenance_supplies` | Fixings, lubricants, sealants, light bulbs |
| Security Consumables | `security_consumables` | Cable ties, tamper seals, tags, labels |
| Horticultural Supplies | `horticultural_supplies` | Fertilisers, compost, seeds, mulch |
| Building Materials | `building_materials` | Paint, filler, mortar, tile adhesive |
| Other | `other` | Any stock type not covered above — description mandatory |

Stock categories are fixed in v1. They support operational filtering and financial cost categorisation in reporting.

---

## STOCK LOCATIONS

Stock is held at named locations. Every quantity of a stock item is associated with a specific location.

### Location Types

| Type | Code | Meaning |
|---|---|---|
| Depot | `depot` | Company's own warehouse or depot |
| Vehicle | `vehicle` | Stock carried in a specific company vehicle |
| Site | `site` | Stock stored permanently or semi-permanently at a client site |

### Stock Location Record

| Field | Type | Notes |
|---|---|---|
| `location_id` | UUID | Platform-generated |
| `location_type` | Enum | `depot` \| `vehicle` \| `site` |
| `name` | String | e.g., "Main Depot", "Van 14", "Canary Wharf Office Store" |
| `site_id` | Foreign key (nullable) | Populated only for `site` location type |
| `status` | Enum | `active` \| `inactive` |

### Stock Level Record (per item per location)

The stock level is the quantity of a specific stock item available at a specific location.

| Field | Type | Notes |
|---|---|---|
| `level_id` | UUID | Platform-generated |
| `stock_item_id` | Foreign key | The stock item |
| `location_id` | Foreign key | The location |
| `quantity_available` | Decimal | Current available quantity |
| `last_updated` | Timestamp | When this level was last changed |

Stock levels are maintained by InventoryMutation records. Every approved stock usage from a job decreases the quantity_available at the relevant location.

---

## STOCK OWNERSHIP

All stock is company-owned. There is no concept of client-owned or job-owned stock in v1.

Workers do not own stock. Workers draw from company stock when performing a job. The stock is company property before, during, and after job usage.

Stock locations (depot, vehicle, site) are company-managed. Even site-held stock is company property placed at the client's location for operational convenience.

---

## STOCK USAGE SUBMISSION

Workers record stock usage inside their **worker report** (see Report Domain). Stock usage is not a separate submission type.

When a worker uses company stock during a job visit, they record each item used in the `stock_items_used` array of their report:
- Select the stock item from the active catalogue
- Enter the quantity used
- Optionally add a note

This record enters Review Centre as part of the report. The report (including all stock usage items) is reviewed by the PM or CEO. Upon report approval, each stock usage item creates one `InventoryMutation` record.

**Decision:** Stock usage as part of the report (rather than as a separate standalone submission) is the correct model. A worker who used three cleaning products, a bucket, and a mop during a visit should not need to submit five separate stock usage records in addition to their report. The report is the natural container for what happened on a visit — stock usage is part of what happened.

---

## APPROVAL REQUIREMENTS

Stock usage is approved as part of the report approval. There is no separate stock approval workflow.

The reviewer (PM or CEO) verifying the report can see:
- The work summary (what the worker did)
- The stock items and quantities listed
- The site and job context

The reviewer verifies whether the stock usage is plausible given the work performed. If the stock usage is implausible or incorrect, the entire report is rejected (see Report Domain).

---

## STOCK DEDUCTION TRIGGER

The stock deduction (InventoryMutation) is created at the moment of report approval, not at report submission.

This is consistent with the Approval Doctrine: no financial or operational record is treated as real until approved. A worker submitting a report with stock usage items does not immediately decrement inventory. The inventory is decremented only when the report is approved.

**Decision:** Pre-approval inventory reservation (holding stock against pending reports) is not implemented in v1. A stock item's available quantity reflects only approved usages. This simplifies the stock model and eliminates the need for a reservation/release mechanism. The risk — that two workers simultaneously use the last unit of a stock item and both reports are submitted for approval — is acceptable in v1 given the company sizes in the target market. Inventory reservation is deferred.

---

## INVENTORYMUTATION RECORD

One InventoryMutation is created per stock usage item when a report is approved.

| Field | Content |
|---|---|
| `mutation_id` | UUID |
| `job_id` | The job the stock was used on |
| `worker_id` | The worker who used the stock |
| `stock_item_id` | The stock item |
| `location_id` | Where the stock was drawn from (resolved from the worker's assigned stock location) |
| `quantity` | Negative value (deduction: e.g., -2 litres) |
| `unit` | Derived from stock item record |
| `unit_cost` | Frozen from stock item record at approval time |
| `total_cost` | quantity (absolute) × unit_cost |
| `approved_by` | Approver user ID |
| `approved_at` | Timestamp |
| `source_report_id` | The report that triggered this mutation |
| `status` | `normalized` |

### Location Resolution

When a worker records stock usage in their report, the location of the stock is inferred from the worker's primary operational context:
1. If the stock item has a site-level inventory at the job's site, that location is used first.
2. Otherwise, the worker's assigned vehicle stock is used.
3. Otherwise, the company depot is used.

The location resolution is applied at approval time and recorded on the InventoryMutation. Location resolution is advisory in v1 — the PM can override the location during review if the auto-resolution is incorrect.

---

## FINANCIAL IMPACT

The InventoryMutation records the materials cost against the job.

In the job mini-ledger:
- Each InventoryMutation's `total_cost` contributes to the job's **Total Materials Cost**
- Total Materials Cost feeds into Total Cost and Gross Margin calculations

InventoryMutation records are never directly billed to the client as invoice line items. If the job contract includes reimbursable materials, the PM/CEO creates an invoice line item for materials separately, using the job's InventoryMutation records as the basis for the billable amount. The InventoryMutation itself is an internal cost record.

**Decision:** Materials cost is an internal cost record only. The client billing decision (whether to recharge materials) is a commercial decision made at the invoice level, not at the approval level. This separates the question of "what materials were used" (operational/cost fact) from "should the client pay for them" (commercial decision). This is consistent with the expense model: a non-billable expense creates an internal cost record; a billable expense creates both an internal cost record and a pending invoice line item. For stock materials, all InventoryMutations are internal cost records. The PM/CEO adds a materials line to the invoice if the contract requires it.

---

## STOCK ALERTS AND REORDER

When a stock item's `quantity_available` at a location falls below the `reorder_threshold`, a low stock alert is generated.

Alerts are informational only. They notify the assigned PM or CEO that a stock item needs restocking. They do not trigger automatic purchasing or ordering.

Low stock alerts are a notification event. They are not submissions and do not enter Review Centre.

---

## STOCK REPLENISHMENT

Stock replenishment — recording the receipt of new stock — is a CEO or PM action.

Replenishment creates a positive InventoryMutation (stock-in), increasing the `quantity_available` at the target location.

| Field | Content |
|---|---|
| `mutation_id` | UUID |
| `stock_item_id` | The restocked item |
| `location_id` | Where stock is being received |
| `quantity` | Positive value (stock-in) |
| `unit_cost` | The cost per unit for this batch (may differ from the catalogue unit_cost) |
| `total_cost` | quantity × unit_cost |
| `recorded_by` | PM or CEO user ID |
| `recorded_at` | Timestamp |
| `notes` | Optional — supplier name, batch reference, delivery note number |

Stock replenishment does not require CEO-specific approval (unlike report approval which triggers deduction). Either the PM or CEO may record incoming stock.

**Decision:** The unit_cost on a replenishment event may differ from the catalogue unit_cost (price changes, different supplier). The catalogue unit_cost is the default used for future InventoryMutation records. When a replenishment records a different unit_cost, the PM or CEO may choose to update the catalogue unit_cost to reflect the new price. Batch cost averaging is deferred; v1 uses the catalogue unit_cost at the time of approval as the cost basis for each usage.

---

## STOCK TRANSFER

Stock may be transferred between locations (depot to vehicle, vehicle to site, etc.).

A stock transfer creates two InventoryMutation records:
1. A negative mutation at the source location (stock-out)
2. A positive mutation at the destination location (stock-in)

Stock transfers are a PM or CEO action. They are not submissions and do not enter Review Centre. They are operational records.

A stock transfer does not create a job cost. Transfers are internal logistics, not job expenses.

---

## STOCK WRITE-OFF

If stock is damaged, lost, or expired, a stock write-off records the removal of units from inventory.

A write-off creates a negative InventoryMutation at the relevant location with `job_id: null` (not attributed to a job) and a mandatory write-off reason.

Stock write-offs require CEO approval in v1 — they reduce company assets and require governance oversight.

---

## RBAC

| Role | Can View Catalogue | Can Record Usage (in Report) | Can Approve Usage | Can Replenish | Can Write Off | Can Transfer |
|---|---|---|---|---|---|---|
| Worker | Yes (for selection in report) | Yes | No | No | No | No |
| PM | Yes | No (not workers) | Yes (own jobs) | Yes | No | Yes |
| CEO | Yes | No | Yes (all) | Yes | Yes | Yes |
| Client | No | No | No | No | No | No |

---

## AUDIT REQUIREMENTS

| Action | Audit Entry Type |
|---|---|
| InventoryMutation created (job usage — approved) | `inventory_mutation_created` |
| Stock replenishment recorded | `stock_replenishment_recorded` |
| Stock transfer recorded | `stock_transfer_recorded` |
| Stock write-off approved | `stock_writeoff_approved` |
| Low stock alert triggered | `stock_low_alert_triggered` |
| Stock item added to catalogue | `stock_item_created` |
| Stock item discontinued | `stock_item_discontinued` |

All entries carry: `who`, `what`, `when`, `source_object_id` (mutation_id or stock_item_id), `external_reference` (job_id where applicable).

---

## CONSTRAINTS AND INVARIANTS

1. All stock items must be selected from the active company stock catalogue. Workers cannot free-text material names in reports.
2. A discontinued stock item cannot be selected in new report submissions. Existing approved InventoryMutation records referencing a discontinued item are retained.
3. Stock usage quantities must be positive in the worker's report. The InventoryMutation stores the value as negative (deduction).
4. InventoryMutation records for job usage require an associated approved report. There is no direct stock deduction without a report.
5. Approved InventoryMutation records are immutable. Corrections follow the Financial Record Correction Domain.
6. Stock level quantity cannot go below zero in the system. If a report approval would cause a negative quantity, the system flags this as a stock discrepancy — the approval proceeds (the operational reality is that the stock was used) but an alert is generated for the PM/CEO to investigate the discrepancy.
7. Stock transfer records are not job costs. Job attribution on a stock transfer is null.
8. Stock write-offs require CEO approval. PMs may not write off stock.
9. The unit cost on an InventoryMutation is frozen at approval time. Stock catalogue price changes do not retroactively affect approved records.
10. Demo company stock data must never appear in a real-business company context.

---

## WHAT THIS DOMAIN DOES NOT COVER

- **Vendor purchasing and purchase orders** — the process of ordering new stock from suppliers is outside v1 scope; stock replenishment is recorded on receipt, not at the point of ordering
- **Batch cost averaging (FIFO/LIFO/AVCO)** — v1 uses a simple catalogue unit cost; inventory valuation methods are deferred
- **Client-owned stock** — materials owned by the client but stored at their site are not tracked in v1
- **Minimum order quantities and supplier management** — deferred
- **Barcode scanning** — workers select stock items from the catalogue list in v1; barcode scanning for faster selection is deferred
- **Stock budgets per job** — whether a job has a materials budget ceiling is deferred

---

## STOCK DOMAIN DECISIONS — SUMMARY TABLE

| Decision | Resolution |
|---|---|
| What is stock? | Company-owned consumable materials used in performing work |
| Stock vs expense | Stock = drawn from company-held inventory; Expense = worker purchases out of pocket |
| Stock vs asset | Stock = consumed (gone after use); Asset = used and returned to company ownership |
| Stock submission model | Embedded in worker report (stock_items_used array); not a separate submission type |
| Approval trigger for deduction | Report approval — not at report submission |
| Pre-approval reservation | Not implemented in v1 |
| Financial record on approval | InventoryMutation per stock usage item |
| Financial impact | Materials cost against job mini-ledger |
| Client billing | Not automatic — PM/CEO adds materials line to invoice if contract requires |
| Unit cost frozen at | Approval time |
| Stock locations | Depot, Vehicle, Site |
| Location resolution | Auto-inferred from job/worker context; PM/CEO override available |
| Stock replenishment | PM or CEO action; no Review Centre approval |
| Stock write-off | CEO approval required |
| Stock transfer | PM or CEO action; no Review Centre approval |
| Low stock alerts | Informational notification; no automatic purchasing |
| Negative quantity | Allowed (flagged as discrepancy); alert generated |
