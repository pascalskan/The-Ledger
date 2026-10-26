// Thrown by the configuration loaders and the test-database guard when the
// environment is unusable (Phase 0 spec §4.6, PS-01).
//
// A ConfigError names VARIABLES and fixed problem phrases only. It never holds a
// value, a URL, a key or a secret, so the process entry points can log it as a
// FATAL line without leaking anything (G0-36).

export interface ConfigIssue {
  /** The environment variable name (never its value). */
  readonly variable: string;
  /** A fixed phrase such as "missing" or "must include a password". */
  readonly problem: string;
}

export class ConfigError extends Error {
  readonly issues: readonly ConfigIssue[];

  constructor(issues: readonly ConfigIssue[]) {
    const frozen = Object.freeze(issues.map((i) => Object.freeze({ ...i })));
    super(
      `Invalid configuration: ${frozen.map((i) => `${i.variable} (${i.problem})`).join(", ")}`,
    );
    this.name = "ConfigError";
    this.issues = frozen;
  }

  /** The names of every variable that failed, without duplicates. */
  get variables(): readonly string[] {
    return [...new Set(this.issues.map((i) => i.variable))];
  }
}
