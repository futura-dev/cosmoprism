import { spawnSync } from "node:child_process";
import path from "node:path";

export type Context = "central" | "tenant";

export const TENANT_DB_URL_ENV = "TENANT_DATABASE_URL";

export const contextDir = (context: Context): string =>
  path.join("prisma", context);

export const configPath = (context: Context): string =>
  path.join(contextDir(context), "prisma.config.ts");

export const schemaPath = (context: Context): string =>
  path.join(contextDir(context), "schema.prisma");

export interface ContextTarget {
  central?: boolean;
  tenant?: boolean;
}

export const contextsFrom = (target: ContextTarget): Context[] => {
  const contexts: Context[] = [];
  if (target.central) contexts.push("central");
  if (target.tenant) contexts.push("tenant");

  if (contexts.length === 0)
    throw new Error(
      "ERR: nothing selected. Pass '-c' for central, '-t' for tenant, or both."
    );

  return contexts;
};

export interface Target {
  central?: boolean;
  tenant?: string | true;
  allTenants?: boolean;
}

const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";

export const runPrisma = (
  args: string[],
  env: NodeJS.ProcessEnv = {}
): void => {
  const result = spawnSync(npxBin, ["prisma", ...args], {
    stdio: "inherit",
    env: { ...process.env, ...env },
    encoding: "utf-8"
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `'prisma ${args.join(" ")}' failed with exit code ${result.status}`
    );
  }
};

export const prismaGenerate = (
  context: Context,
  env: NodeJS.ProcessEnv = {}
): void => runPrisma(["generate", `--config=${configPath(context)}`], env);

export const prismaSeed = (
  context: Context,
  env: NodeJS.ProcessEnv = {}
): void => runPrisma(["db", "seed", `--config=${configPath(context)}`], env);
