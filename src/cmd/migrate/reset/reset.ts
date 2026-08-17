import {
  Context,
  TENANT_DB_URL_ENV,
  Target,
  configPath,
  prismaGenerate,
  prismaSeed,
  runPrisma
} from "../../../utils/prisma-cli";
import { resolveTarget } from "../../../utils/tenants";

export interface ResetCommand extends Target {
  force?: boolean;
  skipSeed?: boolean;
  skipGenerate?: boolean;
}

const migrateReset = (
  context: Context,
  command: ResetCommand,
  env: NodeJS.ProcessEnv = {}
): void => {
  const commandArgs: string[] = [`--config=${configPath(context)}`];
  if (command.force) commandArgs.push("--force");

  runPrisma(["migrate", "reset", ...commandArgs], env);

  if (!command.skipGenerate) prismaGenerate(context, env);
  if (!command.skipSeed) prismaSeed(context, env);
};

export const reset = async (command: ResetCommand): Promise<void> => {
  const { central, tenantUrls } = await resolveTarget(command, {
    promptable: true
  });

  if (central) {
    console.log(`\nrunning 'migrate reset' for central ...`);
    migrateReset("central", command);
    console.log(`running 'migrate reset' for central completed 👌\n`);
  }

  if (tenantUrls.length > 0) {
    console.log(
      `\nrunning 'migrate reset' for ${tenantUrls.length} tenants ...\n`
    );

    for (const url of tenantUrls) {
      migrateReset("tenant", command, { [TENANT_DB_URL_ENV]: url });
      console.log(url, " completed 👌");
    }
  }

  console.log("\nall done 🚀 !!");
};
