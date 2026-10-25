// Programming and infrastructure errors (Phase 0 spec §4.7). None of these is an
// AppError, so each surfaces as a generic 500 and is logged through the error
// serializer ("any other error": name, message, stack). Their messages are fixed text
// and never contain input values.

/** A tenant (company ID) is missing, or is not a UUID (§4.1). */
export class MissingTenantContextError extends Error {
  constructor(message = "A valid tenant context is required") {
    super(message);
    this.name = "MissingTenantContextError";
  }
}

/** The context is not one a platform factory built: a copy, a literal, or an edited clone (§4.1, R2-01). */
export class ForgedContextError extends Error {
  constructor(message = "The execution context was not created by the platform") {
    super(message);
    this.name = "ForgedContextError";
  }
}

/** The context belongs to a request or unit of work that has ended (§4.1, R2-01). */
export class ContextExpiredError extends Error {
  constructor(message = "The execution context has expired") {
    super(message);
    this.name = "ContextExpiredError";
  }
}

/** `runInTransaction` or `tx.transaction()` was used while a unit of work was already active (§4.4, R2-06). */
export class NestedUnitOfWorkError extends Error {
  constructor(message = "A unit of work is already active; nesting and savepoints are not allowed") {
    super(message);
    this.name = "NestedUnitOfWorkError";
  }
}

/** A unit of work was used after it committed or rolled back (§4.4). */
export class UnitOfWorkClosedError extends Error {
  constructor(message = "The unit of work is closed") {
    super(message);
    this.name = "UnitOfWorkClosedError";
  }
}

/**
 * The database rolled the transaction back by itself, because an earlier statement had
 * failed and the failure was caught. A COMMIT on an aborted transaction reports
 * ROLLBACK without raising an error, so the unit refuses to report success.
 */
export class UnitOfWorkAbortedError extends Error {
  constructor(options?: { cause?: unknown }) {
    super("The unit of work was rolled back by the database after a failed statement", options);
    this.name = "UnitOfWorkAbortedError";
  }
}

/** An audit write failed, so the unit of work cannot commit (§4.4). `cause` is the first failure. */
export class AuditWriteFailedError extends Error {
  constructor(message = "The audit entry could not be written", options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AuditWriteFailedError";
  }
}

/** An outbox write failed, so the unit of work cannot commit (§4.4). `cause` is the first failure. */
export class OutboxWriteFailedError extends Error {
  constructor(message = "The domain event could not be written", options?: { cause?: unknown }) {
    super(message, options);
    this.name = "OutboxWriteFailedError";
  }
}

/** A `humanOnly` port was called without a human actor (PS-16). Arrives with the port registry. */
export class HumanActorRequiredError extends Error {
  constructor(message = "This operation requires a human actor", options?: { cause?: unknown }) {
    super(message, options);
    this.name = "HumanActorRequiredError";
  }
}

/** `append()` refused an unregistered entry type, a type owned by another module, or a missing `jobId` (§4.4). */
export class AuditEntryTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuditEntryTypeError";
  }
}

/** `record()` refused an unregistered event type, a type owned by another module, or a missing `jobId` (§4.4). */
export class EventTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EventTypeError";
  }
}

/** A row about to be inserted names a different company than the context (§4.2, R2-08). */
export class TenantMismatchError extends Error {
  constructor(message = "The row names a different company than the execution context") {
    super(message);
    this.name = "TenantMismatchError";
  }
}

/** `contextOf(req)` was called on a request with no authenticated context, for example in a public route (§4.8). */
export class MissingRequestContextError extends Error {
  constructor(message = "The request has no authenticated execution context") {
    super(message);
    this.name = "MissingRequestContextError";
  }
}

/** The worker no longer holds an outbox row's lock: another worker owns it now (PS-18). */
export class LockLostError extends Error {
  constructor(message = "The outbox row is no longer locked by this worker") {
    super(message);
    this.name = "LockLostError";
  }
}

/**
 * Something changed the unit's transaction or session behind the platform's back: a COMMIT,
 * ROLLBACK, BEGIN, SET ROLE or set_config issued through the unit, or the company setting
 * changed (spec 4.4). The unit is rolled back where possible, the connection destroyed, and
 * this is raised. `condition` names what changed, never a value.
 */
export class UnitOfWorkIntegrityError extends Error {
  constructor(condition: string, options?: { cause?: unknown }) {
    super(`The unit of work failed its integrity check: ${condition}`, options);
    this.name = "UnitOfWorkIntegrityError";
  }
}
