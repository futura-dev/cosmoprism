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

export interface DevCommand extends Target {
  name?: string;
  createOnly?: boolean;
  skipSeed?: boolean;
  skipGenerate?: boolean;
}

const migrateDev = (
  context: Context,
  command: DevCommand,
  env: NodeJS.ProcessEnv = {}
): void => {
  const commandArgs: string[] = [`--config=${configPath(context)}`];
  if (command.name) commandArgs.push("--name", command.name);
  if (command.createOnly) commandArgs.push("--create-only");

  runPrisma(["migrate", "dev", ...commandArgs], env);

  if (!command.skipGenerate) prismaGenerate(context, env);
  if (!command.skipSeed && !command.createOnly) prismaSeed(context, env);
};

export const dev = async (command: DevCommand): Promise<void> => {
  const { central, tenantUrls } = await resolveTarget(command, {
    promptable: true
  });

  if (central) {
    console.log(`\nrunning 'migrate dev' for central ...`);
    migrateDev("central", command);
    console.log(`running 'migrate dev' for central completed 👌\n`);
  }

  if (tenantUrls.length > 0) {
    console.log(
      `\nrunning 'migrate dev' for ${tenantUrls.length} tenants ...\n`
    );

    for (const url of tenantUrls) {
      migrateDev("tenant", command, { [TENANT_DB_URL_ENV]: url });
      console.log(url, " completed 👌");
    }
  }

  console.log("\nall done 🚀 !!");
};
