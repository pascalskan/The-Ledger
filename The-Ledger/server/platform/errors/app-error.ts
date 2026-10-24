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
