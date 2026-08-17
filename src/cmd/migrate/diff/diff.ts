import {
  Context,
  TENANT_DB_URL_ENV,
  Target,
  configPath,
  migrationsPath,
  runPrisma,
  schemaPath
} from "../../../utils/prisma-cli";
import { resolveTarget } from "../../../utils/tenants";

const DIFF_SOURCES = ["empty", "schema", "migrations", "database"] as const;

export type DiffSource = (typeof DIFF_SOURCES)[number];

export interface DiffCommand extends Target {
  from?: string;
  to?: string;
  script?: boolean;
  exitCode?: boolean;
}

const NOT_EMPTY_EXIT_CODE = 2;

const parseDiffSource = (
  direction: "from" | "to",
  value: string
): DiffSource => {
  if ((DIFF_SOURCES as readonly string[]).includes(value))
    return value as DiffSource;

  throw new Error(
    `ERR: unknown --${direction} '${value}'. Pick one of ${DIFF_SOURCES.join(
      ", "
    )}.`
  );
};

const sourceArgs = (
  direction: "from" | "to",
  source: DiffSource,
  context: Context
): string[] => {
  switch (source) {
    case "empty":
      return [`--${direction}-empty`];
    case "schema":
      return [`--${direction}-schema=${schemaPath(context)}`];
    case "migrations":
      return [`--${direction}-migrations=${migrationsPath(context)}`];
    case "database":
      return [`--${direction}-config-datasource`];
  }
};

const migrateDiff = (
  context: Context,
  command: DiffCommand,
  from: DiffSource,
  to: DiffSource,
  env: NodeJS.ProcessEnv = {}
): boolean => {
  const commandArgs: string[] = [
    `--config=${configPath(context)}`,
    ...sourceArgs("from", from, context),
    ...sourceArgs("to", to, context)
  ];
  if (command.script) commandArgs.push("--script");
  if (command.exitCode) commandArgs.push("--exit-code");

  const status = runPrisma(["migrate", "diff", ...commandArgs], env, {
    successExitCodes: command.exitCode ? [0, NOT_EMPTY_EXIT_CODE] : [0]
  });

  return status === NOT_EMPTY_EXIT_CODE;
};

export const diff = async (command: DiffCommand): Promise<void> => {
  const from = parseDiffSource("from", command.from ?? "database");
  const to = parseDiffSource("to", command.to ?? "schema");

  const { central, tenantUrls } = await resolveTarget(command, {
    promptable: true
  });

  const announce = (target: string): void =>
    console.log(command.script ? `\n-- ${target}` : `\n${target}`);

  let anyDifference = false;

  if (central) {
    announce("central");
    anyDifference = migrateDiff("central", command, from, to) || anyDifference;
  }

  for (const url of tenantUrls) {
    announce(url);
    anyDifference =
      migrateDiff("tenant", command, from, to, {
        [TENANT_DB_URL_ENV]: url
      }) || anyDifference;
  }

  if (command.exitCode && anyDifference) process.exitCode = NOT_EMPTY_EXIT_CODE;
};
