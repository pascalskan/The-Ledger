# THE LEDGER — ASSET DOMAIN

## Frozen Domain Definition

Version: 1.0
Status: FROZEN
Date: June 4, 2026
Authority: Domain Definition Session — June 4, 2026

---

## STATUS

This document is the authoritative definition of the Asset Domain in The Ledger.

Every decision recorded here is final. Ambiguities raised in the Domain Definition Audit regarding asset definition, assignment exclusivity, lifecycle, usage submission, EquipmentUsageRecord creation, cost attribution, and audit requirements have been resolved.

This document supersedes any prior partial definitions, audit findings, or implementation assumptions regarding company assets and equipment.

Backend planning for the Asset Domain may begin from this document.

---

## WHAT IS AN ASSET?

An asset is a company-owned piece of equipment that is used during the performance of work, is returned to company custody after use, and retains its identity across multiple uses.

An asset is NOT:
- A consumable material (see Stock Domain — consumables are stock items, not assets)
- An out-of-pocket equipment hire by a worker (that is an expense, category: `tools_equipment`)
- A client-owned fixture at a site (outside v1 scope)
- Real property or vehicles (these are company property but outside the operational equipment tracking scope of v1)

Examples of assets:
- Industrial cleaning machines (floor scrubbers, pressure washers, steam cleaners)
- Specialist tools (carpet extraction machines, power tools)
- Safety equipment (scaffolding, harnesses, ladders)
- Security equipment (CCTV cameras, access control panels — where company-owned)
- Horticultural machinery (ride-on mowers, strimmers, hedge cutters)

Assets are tracked because:
1. They have a cost of use that should be attributed to the job (equipment depreciation, hire rate, or internal charge rate)
2. They need to be known to be available before scheduling a job that requires them
3. Their usage history supports maintenance scheduling and asset lifecycle management

---

## WHAT IS AN ASSET RECORD?

An asset record is the entry in the company's asset register representing one specific physical item.

### Asset Record Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `asset_id` | UUID | System | Platform-generated |
| `company_id` | UUID | System | Multi-tenancy scoping |
| `name` | String | Always | Human-readable name (e.g., "Tennant T300 Floor Scrubber") |
| `asset_type` | Enum | Always | See Asset Types below |
| `serial_number` | String | Optional | Manufacturer or company serial number |
| `purchase_date` | Date | Optional | When the company acquired the asset |
| `purchase_cost` | Decimal | Optional | Original acquisition cost — for reporting purposes |
| `cost_model` | Enum | Always | See Cost Model below |
| `cost_rate` | Decimal | Always | Cost per hour or flat per-use cost, depending on cost_model |
| `status` | Enum | System | `available` \| `assigned` \| `in_use` \| `maintenance` \| `retired` |
| `current_location` | Foreign key (nullable) | System | The location where the asset currently resides (depot, vehicle, or site) |
| `assigned_to_job_id` | Foreign key (nullable) | System | The job the asset is currently assigned to (null if not assigned) |
| `assigned_to_worker_id` | Foreign key (nullable) | System | The worker the asset is currently assigned to (null if not assigned) |
| `created_at` | Timestamp | System | |
| `created_by` | User ID | System | |

### Asset Types

| Type | Code | Examples |
|---|---|---|
| Cleaning Machine | `cleaning_machine` | Floor scrubbers, carpet extractors, pressure washers, steam cleaners |
| Power Tool | `power_tool` | Drills, angle grinders, circular saws |
| Horticultural Machine | `horticultural_machine` | Mowers, strimmers, hedge trimmers, leaf blowers |
| Safety Equipment | `safety_equipment` | Harnesses, scaffolding, ladders, safety barriers |
| Security Equipment | `security_equipment` | Company-owned CCTV, access control equipment, monitoring devices |
| Measurement Equipment | `measurement_equipment` | Moisture meters, thermal cameras, gas detectors |
| Other | `other` | Equipment not covered above — description mandatory |

---

## ASSET COST MODEL

Every asset has a defined cost model that governs how its usage is costed against a job.

### Cost Model Types

| Model | Code | Meaning |
|---|---|---|
| Per Hour | `per_hour` | Cost is charged per hour of use. EquipmentUsageRecord cost = duration_minutes / 60 × cost_rate |
| Per Use | `per_use` | Flat cost charged each time the asset is used on a job, regardless of duration. EquipmentUsageRecord cost = cost_rate |

**Decision:** Two cost models cover the operational reality. Equipment that is hired by the hour or charged to jobs based on time (industrial floor scrubbers, specialist tools) uses `per_hour`. Equipment that has a fixed cost per deployment regardless of duration (safety barriers set up at a site, a monitoring device installed for a visit) uses `per_use`. The cost_rate value on the asset record carries the appropriate monetary value for the model selected.

The cost rate is determined by the company. It represents:
- An internal depreciation charge, OR
- The rate at which the company would hire equivalent equipment externally, OR
- Any other basis the company chooses for internal cost attribution

The platform does not calculate depreciation — it applies the configured rate.

---

## ASSET ASSIGNMENT

An asset may be assigned to:
- A **job** (the asset will be used at the job's site)
- A **worker** (the asset is that worker's primary operational equipment)

Assignment records that the asset is committed to a specific deployment. An assigned asset appears as available to that job or worker for report recording purposes.

### Assignment Exclusivity

An asset may only be assigned to **one active job at a time**.

If Asset A is assigned to Job 123, it cannot simultaneously be assigned to Job 456. It must be returned (assignment ended) before it can be assigned to another job.

**Decision rationale:** Physical equipment cannot be in two places at once. Enforcing single-job assignment at the platform level prevents scheduling conflicts where the same piece of equipment is promised to two jobs on the same day. This is a hard constraint, not a warning.

### Worker Assignment

An asset assigned to a specific worker (rather than a specific job) represents equipment that is that worker's primary operational tool for all their work — e.g., a worker who always carries a specific power tool or uses a specific company vehicle.

Worker-assigned assets are available on any job that worker is assigned to, without requiring per-job assignment.

### Assignment Without Scheduling

An asset may be used on a job without being formally assigned to that job beforehand — a worker may take available equipment from the depot and record it in their report. Formal pre-assignment is recommended for planning and availability visibility, but it is not enforced as a prerequisite for usage reporting in v1.

---

## ASSET LIFECYCLE

### States

| Status | Meaning |
|---|---|
| `available` | Asset is in good condition, available for assignment |
| `assigned` | Asset has been committed to a job or worker; not yet actively in use |
| `in_use` | Asset is actively being used at a site (a shift is in progress that has this asset) |
| `maintenance` | Asset is undergoing or awaiting maintenance; cannot be assigned |
| `retired` | Asset has been removed from service permanently; all historical records retained |

### State Transitions

```
available → assigned      (PM or CEO assigns to job or worker)
assigned → available      (assignment ended — asset returned)
assigned → in_use         (worker's shift starts and they are using this asset)
in_use → assigned         (shift ends; asset still assigned to job until explicitly returned)
assigned / available → maintenance  (PM or CEO records asset for maintenance)
maintenance → available   (PM or CEO records maintenance complete)
available / assigned / maintenance → retired  (CEO retires asset)
```

### Retirement

Asset retirement is a CEO-only action. A retired asset is removed from the active asset register but its historical EquipmentUsageRecord records are retained permanently.

Retiring an asset while it is assigned to an active job requires the assignment to be ended first. A retired asset cannot be assigned.

---

## ASSET MAINTENANCE

When an asset requires maintenance, it is placed in `maintenance` status.

Maintenance records are not a full maintenance management system in v1. The platform records:
- The date maintenance began
- The date maintenance completed (when returned to `available`)
- Notes (optional)

This is an operational record. It prevents the asset from being assigned while under maintenance. A full preventive maintenance scheduling system is deferred.

---

## ASSET USAGE SUBMISSION

Workers record equipment usage inside their **worker report** (see Report Domain). Equipment usage is not a separate submission type.

When a worker uses a company asset during a job visit, they record each asset used in the `equipment_items_used` array of their report:
- Select the asset from the active asset register
- Enter the duration of use in minutes
- Optionally add a note

This record enters Review Centre as part of the report. Upon report approval, each equipment usage item creates one `EquipmentUsageRecord`.

---

## EQUIPMENTUSAGERECORD CREATION

One EquipmentUsageRecord is created per equipment usage item when a report is approved.

| Field | Content |
|---|---|
| `eur_id` | UUID |
| `job_id` | The job the asset was used on |
| `worker_id` | The worker who used the asset |
| `asset_id` | The specific asset used |
| `duration_minutes` | Duration of use from the report |
| `cost_model` | Frozen from asset record at approval time |
| `cost_rate` | Frozen from asset record at approval time |
| `total_cost` | Computed: if per_hour: (duration_minutes / 60) × cost_rate; if per_use: cost_rate |
| `approved_by` | Approver user ID |
| `approved_at` | Timestamp |
| `source_report_id` | The report that triggered this record |
| `status` | `normalized` |

The cost model and cost rate are frozen at approval time. Subsequent changes to the asset's cost rate do not retroactively affect approved EquipmentUsageRecord records.

---

## COST ATTRIBUTION

The EquipmentUsageRecord records the equipment cost against the job.

In the job mini-ledger:
- Each EquipmentUsageRecord's `total_cost` contributes to the job's **Total Equipment Cost**
- Total Equipment Cost feeds into Total Cost and Gross Margin calculations

EquipmentUsageRecord costs are not directly billed to clients as invoice line items. If the job contract includes rechargeable equipment costs, the PM/CEO creates an invoice line item for equipment separately. This is consistent with the stock materials billing model.

---

## APPROVAL AUTHORITY

Equipment usage approval is part of report approval (Report Domain). There is no separate equipment usage approval workflow.

PM or CEO reviews and approves the report; all equipment usage items within the report are approved simultaneously.

---

## ASSET AVAILABILITY AND SCHEDULING

When a PM is scheduling a job, the platform displays:
- Assets currently assigned to the job (if any)
- Assets available at the job's site (site-stationed assets)
- Assets assigned to the workers on the job (worker-assigned assets)

This visibility enables the PM to confirm that required equipment will be available before the job begins.

There is no automated conflict prevention at the scheduling stage in v1 — the assignment exclusivity constraint is enforced at the assignment creation step (you cannot assign an already-assigned asset). Scheduling visibility is informational.

---

## SITE-STATIONED ASSETS

An asset may be assigned to a site rather than to a specific job or worker. This represents equipment that is permanently or semi-permanently stationed at a client's location.

Site-stationed assets appear as available resources for any job created at that site. Workers at that site can record these assets in their reports without prior per-job assignment.

Site-stationed assets remain in `assigned` status. Their `current_location` is set to the site location.

---

## RBAC

| Role | Can View Asset Register | Can Record Usage (in Report) | Can Approve Usage | Can Assign Asset | Can Retire Asset | Can Record Maintenance |
|---|---|---|---|---|---|---|
| Worker | Yes (for selection in report) | Yes | No | No | No | No |
| PM | Yes | No (not workers) | Yes (own jobs) | Yes | No | Yes |
| CEO | Yes | No | Yes (all) | Yes | Yes | Yes |
| Client | No | No | No | No | No | No |

---

## AUDIT REQUIREMENTS

| Action | Audit Entry Type |
|---|---|
| Asset added to register | `asset_created` |
| Asset assigned to job | `asset_assigned_to_job` |
| Asset assignment ended | `asset_assignment_ended` |
| Asset assigned to worker | `asset_assigned_to_worker` |
| EquipmentUsageRecord created (approved) | `equipment_usage_recorded` |
| Asset placed in maintenance | `asset_maintenance_started` |
| Asset returned from maintenance | `asset_maintenance_completed` |
| Asset retired | `asset_retired` |
| Asset status changed | `asset_status_changed` |

All entries carry: `who`, `what`, `when`, `source_object_id` (asset_id), `external_reference` (job_id where applicable).

---

## CONSTRAINTS AND INVARIANTS

1. An asset may only be assigned to one active job at a time. Simultaneous assignment to two jobs is not permitted.
2. An asset in `maintenance` or `retired` status cannot be assigned to a job or worker.
3. Asset usage records in reports must reference assets from the active asset register. Workers cannot free-text equipment names.
4. A retired asset cannot be un-retired. Retirement is a terminal status.
5. Approved EquipmentUsageRecord records are immutable. Corrections follow the Financial Record Correction Domain.
6. The cost rate and cost model on an EquipmentUsageRecord are frozen at approval time. Asset rate changes do not retroactively affect approved records.
7. A retired asset's EquipmentUsageRecord history is preserved permanently.
8. Asset retirement with an active assignment requires the assignment to be ended first.
9. Workers may not assign assets to jobs. Assignment is a PM or CEO action.
10. Demo company asset data must never appear in a real-business company context.

---

## WHAT THIS DOMAIN DOES NOT COVER

- **Vehicle fleet management** — company vehicles are outside the asset domain's scope in v1 (vehicle tracking, fuel logs, mileage records are deferred)
- **Asset depreciation calculation** — the platform records a cost rate; it does not calculate depreciation schedules
- **Preventive maintenance scheduling** — automated maintenance scheduling based on usage hours or calendar intervals is deferred; v1 records maintenance events only
- **Asset insurance and warranty** — deferred
- **Client-owned assets** — equipment belonging to the client is not tracked in v1; observations about client assets appear in issue and report QA observations
- **Hire/rental equipment** — equipment hired from a third party for a specific job is handled as an expense submission (category: `tools_equipment`), not as an asset register entry

---

## ASSET DOMAIN DECISIONS — SUMMARY TABLE

| Decision | Resolution |
|---|---|
| What is an asset? | Company-owned equipment used on jobs, returned to company custody after use |
| Asset vs stock | Asset = durable, reused across jobs; Stock = consumable, gone after use |
| Asset vs expense | Asset = company-owned tracked equipment; Expense = worker-hired or out-of-pocket cost |
| Cost model | Per-hour or per-use; defined on asset record; two models cover all operational cases |
| Cost rate frozen at | Approval time |
| Assignment exclusivity | One active job at a time — hard constraint, not a warning |
| Worker assignment | Allowed; worker-assigned assets available on all their jobs |
| Usage submission model | Embedded in worker report (equipment_items_used array); not a separate submission type |
| Approval trigger | Report approval |
| Financial record on approval | EquipmentUsageRecord per equipment usage item |
| Financial impact | Equipment cost against job mini-ledger |
| Client billing | Not automatic — PM/CEO adds equipment line to invoice if contract requires |
| Asset lifecycle states | available → assigned → in_use → maintenance → retired |
| Retirement | CEO-only; terminal; history preserved |
| Maintenance recording | PM or CEO; operational record; no automated scheduling in v1 |
| Site-stationed assets | Supported; available to all jobs at the site |
| Pre-assignment prerequisite | Recommended but not enforced in v1 |
