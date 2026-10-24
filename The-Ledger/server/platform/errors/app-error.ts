// The base class for errors that are meant to reach the client (Phase 0 spec
// §4.7, §6.3). The platform subclasses (ValidationError, NotFoundError, ...) and
// the global error handler arrive in commit 3.
//
// `safeMessage` is written for the user and contains no input values.
// `details` goes to the client in the error envelope and is never logged.

export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly safeMessage: string;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(
    code: string,
    status: number,
    safeMessage: string,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(safeMessage);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
    this.safeMessage = safeMessage;
    if (details !== undefined) this.details = details;
  }
}

// The platform subclasses (Phase 0 spec §4.7, §6.3). Messages are British English,
// written for the user, and contain no input values. Modules define their own
// codes as AppErrors, or use these with a more specific message.

export class ValidationError extends AppError {
  constructor(
    safeMessage = "Request validation failed.",
    details?: Readonly<Record<string, unknown>>,
  ) {
    super("VALIDATION_ERROR", 400, safeMessage, details);
  }
}

export class UnauthenticatedError extends AppError {
  /** True for an invalid or expired token: the 401 then carries `error="invalid_token"` (§6.2). */
  readonly invalidToken: boolean;

  constructor(
    safeMessage = "Authentication is required.",
    options: { code?: "UNAUTHENTICATED" | "TOKEN_EXPIRED"; invalidToken?: boolean } = {},
  ) {
    super(options.code ?? "UNAUTHENTICATED", 401, safeMessage);
    this.invalidToken = options.invalidToken ?? options.code === "TOKEN_EXPIRED";
  }
}

export class ForbiddenError extends AppError {
  constructor(safeMessage = "You do not have permission to do that.") {
    super("FORBIDDEN", 403, safeMessage);
  }
}

export class NotFoundError extends AppError {
  constructor(
    safeMessage = "The requested resource was not found.",
    details?: Readonly<Record<string, unknown>>,
  ) {
    super("NOT_FOUND", 404, safeMessage, details);
  }
}

export class ConflictError extends AppError {
  constructor(
    safeMessage = "The request conflicts with the current state.",
    details?: Readonly<Record<string, unknown>>,
  ) {
    super("CONFLICT", 409, safeMessage, details);
  }
}

export class BusinessRuleError extends AppError {
  constructor(
    safeMessage = "A business rule refused the request.",
    details?: Readonly<Record<string, unknown>>,
    code = "BUSINESS_RULE_VIOLATION",
  ) {
    super(code, 422, safeMessage, details);
  }
}
