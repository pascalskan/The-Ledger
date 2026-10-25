import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";
import { ConfigError } from "../server/platform/errors/config-error";
import { scanClientEnvFiles } from "../server/platform/config/env";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jose",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  // Vite inlines client/.env.production into the bundle at build time, so no
  // backend variable or secret-looking VITE_ name may be defined in client/.env*
  // (Phase 0 spec section 4.6, R3-17). Names only are read.
  const clientEnvIssues = scanClientEnvFiles();
  if (clientEnvIssues.length > 0) throw new ConfigError(clientEnvIssues);

  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  // Two bundles: the API and the worker. Both always run as production (the define below
  // replaces the literal process.env.NODE_ENV expression in the config module, spec 4.6).
  for (const entry of ["index", "worker"]) {
    await esbuild({
      entryPoints: [`server/${entry}.ts`],
      platform: "node",
      bundle: true,
      format: "cjs",
      outfile: `dist/${entry}.cjs`,
      define: {
        "process.env.NODE_ENV": '"production"',
      },
      minify: true,
      external: externals,
      logLevel: "info",
    });
  }
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
