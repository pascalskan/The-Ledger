import type { Logger } from "pino";
import { isVitest } from "../config";
import { isErrorObject } from "../logging/error-serializer";

// Review round 2, minor 6. A rejection nobody awaited, or an exception nothing caught, would
// otherwise reach Node's default handler, which prints the raw error - a PostgreSQL error's
// `detail` and `where` included - to stderr and bypasses the safe logger entirely. Both
// processes register these handlers once the logger exists: the failure is logged at FATAL
// through the error serializer, and the process exits 1 (a process in an unknown state does
// not carry on). Registration is injectable, so a test can invoke the handler directly.

export type CrashKind = "unhandledRejection" | "uncaughtException";
export type CrashHandler = (kind: CrashKind, reason: unknown) => void;
export type RegisterCrashHandlers = (handler: CrashHandler) => void;

/**
 * The default registration: the real process events. Under Vitest it registers nothing: a test
 * worker has its own handlers, and a handler that exits the process would end the test run (a
 * test that wants the handlers injects its own registration).
 */
export const registerOnProcess: RegisterCrashHandlers = (handler) => {
  if (isVitest()) return;
  process.on("unhandledRejection", (reason) => handler("unhandledRejection", reason));
  process.on("uncaughtException", (error) => handler("uncaughtException", error));
};

/**
 * Installs the handlers. The first failure is logged and exits 1; a second one while exiting
 * is ignored, so a failing logger cannot cause a loop. A reason that is not an Error is never
 * logged, only its type: a thrown string or object may carry input.
 */
export function installCrashHandlers(
  logger: Logger,
  exit: (code: number) => void,
  register: RegisterCrashHandlers = registerOnProcess,
): void {
  let handling = false;
  register((kind, reason) => {
    if (handling) return;
    handling = true;
    const message = kind === "unhandledRejection" ? "Unhandled promise rejection" : "Uncaught exception";
    try {
      logger.fatal(isErrorObject(reason) ? { err: reason } : { thrownType: typeof reason }, message);
    } finally {
      exit(1);
    }
  });
}
