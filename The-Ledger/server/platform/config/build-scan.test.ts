import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadApiConfig, scanClientEnvFiles, scanEnvironmentForViteSecrets } from "./env";

// Review round 2, minor 4: the VITE_ secret checks.

const MARK = "MARKER-VITE-5521";
let appDir: string;
beforeEach(() => {
  appDir = mkdtempSync(path.join(os.tmpdir(), "ledger-vite-"));
});
afterEach(() => rmSync(appDir, { recursive: true, force: true }));

const clientFile = (name: string, text: string) => {
  mkdirSync(path.join(appDir, "client"), { recursive: true });
  writeFileSync(path.join(appDir, "client", name), text);
};
const names = (issues: { variable: string }[]) => issues.map((i) => i.variable);

describe("the secret-looking VITE_ name pattern is case-insensitive", () => {
  it.each([
    "VITE_JWT_SECRET", "VITE_jwt_secret", "VITE_Api_Key", "VITE_apikey", "VITE_Database_Url", "VITE_password", "VITE_Auth_Token", "VITE_portalSecret",
  ])("%s is refused in the real environment, by the loader", (name) => {
    expect(() => loadApiConfig({ [name]: MARK }, { appDir })).toThrow(expect.objectContaining({ variables: [name] }));
    expect(names(scanEnvironmentForViteSecrets({ [name]: MARK }))).toEqual([name]);
  });

  it("ordinary VITE_ variables, and lower-case vite_ (which Vite does not expose), are not refused", () => {
    expect(scanEnvironmentForViteSecrets({ VITE_APP_TITLE: "x", VITE_PUBLIC_URL: "y", vite_jwt_secret: "z", NODE_ENV: "development" })).toEqual([]);
  });

  it("scanEnvironmentForViteSecrets reports names, never values", () => {
    const issues = scanEnvironmentForViteSecrets({ VITE_X_SECRET: MARK, VITE_Y_TOKEN: MARK, VITE_FINE: MARK });
    expect(names(issues)).toEqual(["VITE_X_SECRET", "VITE_Y_TOKEN"]);
    expect(JSON.stringify(issues)).not.toContain(MARK);
  });
});

describe("client/.env* line forms", () => {
  it.each([
    ["VITE_JWT_SECRET=x", "VITE_JWT_SECRET"],
    ["VITE_jwt_secret = x", "VITE_jwt_secret"],
    ["export VITE_API_KEY=x", "VITE_API_KEY"],
    ["VITE_SECRET: x", "VITE_SECRET"],
    ["  VITE_API-KEY=x", "VITE_API-KEY"],
    ["VITE_API.KEY=x", "VITE_API.KEY"],
    ["LEDGER_APP_DATABASE_URL=postgresql://x", "LEDGER_APP_DATABASE_URL"],
    ["ledger_app_database_url=postgresql://x", "ledger_app_database_url"],
    ["jwt_private_key=x", "jwt_private_key"],
    ["PORTAL_JWT_SECRET: x", "PORTAL_JWT_SECRET"],
  ])("%j is found", (line, name) => {
    clientFile(".env.production", `# a comment\n${line}\nVITE_APP_TITLE=fine\n`);
    expect(names(scanClientEnvFiles(appDir))).toEqual([name]);
  });

  it("comments, blank lines and harmless names are not findings", () => {
    clientFile(".env", "# VITE_JWT_SECRET=x\n\n   \nVITE_APP_TITLE=The Ledger\nVITE_PUBLIC_MAP_STYLE=light\n");
    expect(scanClientEnvFiles(appDir)).toEqual([]);
  });

  it("never reports a value", () => {
    clientFile(".env.local", `VITE_API_KEY=${MARK}\n`);
    expect(JSON.stringify(scanClientEnvFiles(appDir))).not.toContain(MARK);
  });
});

describe("script/build.ts refuses before it builds anything", () => {
  const root = process.cwd();
  const loader = pathToFileURL(path.join(root, "node_modules", "tsx", "dist", "esm", "index.mjs")).href;

  function build(env: Record<string, string>) {
    return spawnSync(process.execPath, ["--import", loader, path.join(root, "script", "build.ts")], {
      cwd: root,
      env: { PATH: process.env.PATH ?? "", ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}), ...env },
      encoding: "utf8",
      timeout: 60_000,
    });
  }

  it("fails, naming the variable and not its value, when the build environment has a VITE_ secret", () => {
    const result = build({ VITE_Api_Key: MARK });
    expect(result.status).not.toBe(0);
    const output = `${result.stdout}${result.stderr}`;
    expect(output).toContain("VITE_Api_Key");
    expect(output).not.toContain(MARK);
    // it stopped before `vite build` started
    expect(output).not.toContain("building client");
  });
});
