# THE LEDGER — SITE DOMAIN

## Frozen Domain Definition

Version: 1.0
Status: FROZEN
Date: June 4, 2026
Authority: Domain Definition Session — June 4, 2026

---

## STATUS

This document is the authoritative definition of the Site Domain in The Ledger.

Every decision recorded here is final. Ambiguities raised in the Domain Definition Audit have been resolved. This document supersedes any prior partial definitions, audit findings, or implementation assumptions regarding sites, locations, and client-job relationships.

Backend planning for the Site Domain may begin from this document.

---

## THE CORE DECISION: SITE AS A FIRST-CLASS ENTITY

A site is a first-class entity in The Ledger's data model. It is not a job attribute. It is not an address field. It is a persistent, named place where operational work is performed.

**The entity hierarchy is:**

```
Company
  └── Client
        └── Site
              └── Job (one job = one service visit or engagement at the site)
```

**Decision rationale:** The primary market for The Ledger — facilities management, cleaning, security, maintenance, trade businesses — typically serves clients at recurring fixed locations. A cleaning company visits the same office building every week. A maintenance company services the same estate every month. If a site is merely a job address, every recurring visit at that location produces a separate job with a separate address string, and no aggregated view of that location's history, financial performance, or service record exists. Over time, the platform becomes ungroupable at the place level. Persistent site entities make the location a financial and operational container across all jobs performed there, enabling site-level reporting, equipment assignment, service history, and client-facing visibility.

---

## WHAT IS A CLIENT?

A client is a company or person that commissions work from the platform's company. A client is the legal and commercial relationship.

A client has:
- `client_id`
- Name, contact information, billing address
- Payment terms (for invoice generation)
- Portal access flag (whether a client portal login has been provisioned)
- Status: `active` | `inactive`

A client may have one or more sites. A client may have zero sites (before site assignment has been made or for clients that don't have fixed-location work).

A client is the top-level scope for financial reporting at the client level: total invoiced to this client, total outstanding, jobs performed for this client.

---

## WHAT IS A SITE?

A site is a named physical location belonging to a client at which operational work is performed by the platform's company.

A site is persistent. It exists across many jobs over time. It is not recreated for each visit.

### Site Fields

| Field | Type | Notes |
|---|---|---|
| `site_id` | UUID | Platform-generated |
| `client_id` | Foreign key | The client this site belongs to |
| `name` | String | Human-readable site name (e.g., "Canary Wharf Office", "Warehouse Unit 3") |
| `address` | Structured address | Street, city, postcode, country |
| `site_type` | Enum | See Site Types below |
| `status` | Enum | `active` \| `inactive` \| `archived` |
| `assigned_pm_id` | Foreign key (nullable) | The PM primarily responsible for this site |
| `access_notes` | Text (nullable) | Door codes, parking, contact on site, access restrictions |
| `created_at` | Timestamp | |
| `created_by` | User ID | |

### Site Types

| Type | Code | Typical Use |
|---|---|---|
| Office | `office` | Commercial office buildings |
| Retail | `retail` | Shops, showrooms, retail units |
| Industrial | `industrial` | Warehouses, factories, depots |
| Residential | `residential` | Houses, flats, residential estates |
| Healthcare | `healthcare` | Hospitals, clinics, care homes |
| Educational | `educational` | Schools, universities, colleges |
| Hospitality | `hospitality` | Hotels, restaurants, event venues |
| Outdoor | `outdoor` | Parks, grounds, outdoor facilities |
| Mixed Use | `mixed_use` | Sites spanning multiple categories |
| Other | `other` | Any site type not covered above |

**Decision:** Site types are fixed in v1. They are not configurable per company. Site types support operational filtering and reporting categorisation. Configurability is deferred.

---

## SITE HIERARCHY

### Single-Tier in v1

In v1, the site hierarchy is single-tier:

```
Client → Site → Jobs
```

There is no sub-site layer in v1 (no floors, zones, rooms, or areas as formal entities beneath a site).

**Decision rationale:** A sub-site layer (Site → Zone → Job) would be required for enterprise facilities management contracts covering multiple buildings or floors at a single campus. This is a valid long-term requirement. In v1, the complexity is deferred. Companies managing multi-floor or multi-zone sites may use naming conventions (e.g., site names like "Canary Wharf — Floor 3") to differentiate within the single-tier model. Sub-site hierarchy is deferred to a future version.

### Multi-Site Clients

A single client may have many sites. There is no limit on the number of sites per client. Each site is managed independently for operational purposes. Financial reporting at the client level aggregates across all sites.

---

## SITE → JOB RELATIONSHIP

### One Job = One Service Event at One Site

Each job in The Ledger is attributed to exactly one site (and therefore one client).

A job cannot span multiple sites. A job cannot exist without a site. When a job is created, the site must be selected from the client's existing sites. A new site can be created at job-creation time if the site is being serviced for the first time.

**Decision:** Enforcing a mandatory site→job relationship resolves the "job vs engagement vs project" ambiguity from the Domain Definition Audit. Every job is a service event at a specific place. Whether that job takes one hour or three weeks is irrelevant — it is still one job at one site.

### Recurring Work Model

For recurring service contracts (weekly cleaning at a site, monthly maintenance at an estate), each service visit creates a new job. There is no persistent "recurring job" entity in v1.

**Decision rationale:** A recurring job model (where one job accumulates visit records over time) produces complex financial attribution problems: which visit's cost belongs to which invoice period, which worker's timesheet belongs to which visit, and how job completion is defined when the job never ends. The simpler and financially cleaner model is: one visit = one job. The site entity provides the recurring context — all these jobs share a site, and the site's history shows all service visits over time. Financial reporting at the site level aggregates all these jobs. The client sees their service history at a site as a chronological list of completed jobs, not as a single job with internal records.

**Practical note for PM scheduling:** PMs creating recurring visits create a new job for each visit, but the site and client are pre-populated from the previous job at the same site. This reduces the creation friction without introducing a complex recurring-job entity.

---

## SITE OWNERSHIP

### Assigned PM

Each site has an optional `assigned_pm_id`. This PM is the operational responsible owner for that site.

When a new job is created at a site, the site's assigned PM is suggested as the PM for that job. The job-creating PM or CEO may override this.

**CEO Oversight:** The CEO retains visibility of all sites regardless of PM assignment. PM assignment scopes operational responsibility; it does not restrict CEO access.

### Site Transfer

When a PM leaves the company or their role changes, the CEO reassigns site ownership to another PM. Site transfer generates an audit entry: `site_pm_reassigned`. All historical jobs at the site retain their original PM assignments. Only future jobs default to the new assigned PM.

---

## SITE LIFECYCLE

### States

| Status | Meaning |
|---|---|
| `active` | Site is operational — new jobs can be created against it |
| `inactive` | Site is temporarily not receiving service — no new jobs can be created, but historical data is accessible |
| `archived` | Site is permanently closed — no new jobs, historical data read-only only |

### Transitions

- `active` → `inactive`: PM or CEO action. Used when a client pauses service at a site.
- `inactive` → `active`: PM or CEO action. Used when service resumes.
- `active` or `inactive` → `archived`: CEO action only. Irreversible while any open jobs are attributed to the site.
- `archived` cannot transition to any other state.

### Archival Rules

A site cannot be archived if it has any jobs in a non-closed state. All open, active, or pending-closure jobs must be resolved before a site can be archived.

Archived sites are not deleted. Their full history — jobs, financial records, documents, service history — remains accessible in read-only mode.

---

## SITE VISIBILITY

### CEO

Full visibility of all sites, all clients, all associated jobs, financial data, and service history.

### PM

Visibility of sites they are assigned to (via `assigned_pm_id`) and sites associated with any job they are assigned to. PMs do not see sites belonging to other PMs' clients unless they are assigned to a job at that site.

### Worker

Workers see only the site address and access notes for jobs they are currently assigned to. Workers have no site management visibility, no site history visibility, and no financial data at the site level.

### Client (Portal)

Clients see only their own sites in the client portal. Clients see:
- Site name and address
- Jobs at their sites (current and historical, at the level of visibility defined in the Client Portal Access domain — to be defined separately)
- Crew assigned to current jobs at their sites
- Document history at their sites

Clients never see:
- Sites belonging to other clients
- Financial margin or cost data
- Internal access notes

---

## SITE AND FINANCIAL REPORTING

The site is a financial aggregation level between client and job.

Financial Explorer and reporting surfaces may aggregate at:
- Company level (all financial records)
- Client level (all records for jobs at all of a client's sites)
- Site level (all records for jobs at this specific site)
- Job level (individual job records)

Site-level financial reporting shows:
- Total revenue invoiced at this site (across all jobs)
- Total labour cost at this site
- Total expense cost at this site
- Net margin at this site
- Job history count and completion rate

**This aggregation does not create new financial records.** It is a read-only view derived from existing job-level records. The job remains the mini-ledger. The site is a grouping dimension.

---

## SITE AND EQUIPMENT / STOCK

Equipment (assets) and stock items may be assigned to a site. This represents equipment that is permanently or semi-permanently stationed at a client's location (e.g., a cleaning machine stored on-site, a key-management cabinet at a security site).

Assignment of equipment or stock to a site does not constitute a financial transaction. It is an operational record.

When a job is created at a site, equipment and stock assigned to that site are visible as available resources for the job without requiring transport from another location.

---

## SITE ACCESS INFORMATION

The `access_notes` field on a site record stores free-text operational information: door codes, parking instructions, contact names on site, access restrictions, security protocols.

Access notes are visible to:
- CEO (always)
- PM (for assigned sites and job-assigned sites)
- Worker (for their currently assigned jobs — the notes for that site appear in the worker's job detail view)

Access notes are not visible to clients in the portal. Access notes are operational information for the service team.

**Decision:** Access notes are free-text in v1. Structured access information (code lists, contact roles, time windows) is deferred. The operational need is met by free-text in v1.

---

## SITE AUDIT REQUIREMENTS

| Action | Audit Entry Type |
|---|---|
| Site created | `site_created` |
| Site details updated | `site_updated` |
| Site status changed | `site_status_changed` |
| Site PM reassigned | `site_pm_reassigned` |
| Site archived | `site_archived` |
| Job created at site | `job_created_at_site` (carried on the job audit, references site_id) |

All entries carry: `who`, `what`, `when`, `source_object_id` (site_id), `external_reference` (client_id).

---

## CROSS-DOMAIN RULES

### Job Domain

Jobs must carry a `site_id`. The Job Domain must enforce that no job can be created without a valid `site_id` pointing to an active site.

### Client Domain

Site provisioning happens within a client context. A site cannot exist without a `client_id`. Archiving a client (if client archival is implemented) must first resolve all sites belonging to that client.

### Client Portal

The client portal scopes all visible data (jobs, crews, documents, financial summaries) at the site level. A client sees their sites, and the jobs/data attached to each site. Site scoping is the access control boundary in the portal.

### Rejection Domain

Site status changes (active → inactive, archived) are not submissions and are not subject to rejection doctrine. They are direct administrative actions with audit entries.

---

## CONSTRAINTS AND INVARIANTS

1. A site must belong to exactly one client. A site cannot be re-attributed to a different client.
2. A job must be attributed to exactly one site. Jobs without a site are invalid.
3. A site cannot be archived while it has open jobs.
4. Only the CEO may archive a site.
5. `archived` is an irreversible state. There is no un-archive action.
6. Access notes are visible to workers for their assigned jobs. Workers never see site-level management data.
7. Site financial aggregation is a derived view — no financial records are created at the site level.
8. Demo company site data must never appear in a real-business company context. Company context must be enforced at every site query.

---

## SITE DOMAIN DECISIONS — SUMMARY TABLE

| Decision | Resolution |
|---|---|
| Site as first-class entity or job attribute? | First-class entity — persistent, named, independent of individual jobs |
| Entity hierarchy | Company → Client → Site → Job |
| Sub-site hierarchy in v1? | No — single-tier (Site → Job); sub-site deferred |
| One job = what? | One service event (visit or engagement) at one site |
| Recurring work model | Each visit = new job; site provides the recurring context |
| Site ownership | Assigned PM; CEO retains full visibility |
| Site states | active \| inactive \| archived |
| Archival rules | No open jobs; CEO-only; irreversible |
| Worker visibility | Site address and access notes for current jobs only |
| Client portal visibility | Own sites only; no financial margin or internal notes |
| Financial reporting at site level | Derived aggregation — no new financial records created |
| Equipment/stock assignment | Operational record only; no financial transaction |
| Access notes | Free-text field; visible to workers for assigned jobs; not to clients |
| Multi-site clients | Supported; no limit |
