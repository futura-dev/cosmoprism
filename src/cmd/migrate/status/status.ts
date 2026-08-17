import {
  Context,
  TENANT_DB_URL_ENV,
  Target,
  configPath,
  runPrisma
} from "../../../utils/prisma-cli";
import { resolveTarget } from "../../../utils/tenants";

export type StatusCommand = Target;

const NOT_UP_TO_DATE_EXIT_CODE = 1;

const migrateStatus = (
  context: Context,
  env: NodeJS.ProcessEnv = {}
): boolean =>
  runPrisma(["migrate", "status", `--config=${configPath(context)}`], env, {
    successExitCodes: [0, NOT_UP_TO_DATE_EXIT_CODE]
  }) === 0;

export const status = async (command: StatusCommand): Promise<void> => {
  const { central, tenantUrls } = await resolveTarget(command, {
    promptable: true
  });

  const notUpToDate: string[] = [];

  if (central) {
    console.log(`\nrunning 'migrate status' for central ...\n`);
    if (!migrateStatus("central")) notUpToDate.push("central");
  }

  if (tenantUrls.length > 0) {
    console.log(
      `\nrunning 'migrate status' for ${tenantUrls.length} tenants ...`
    );

    for (const url of tenantUrls) {
      console.log(`\n${url}`);
      if (!migrateStatus("tenant", { [TENANT_DB_URL_ENV]: url }))
        notUpToDate.push(url);
    }
  }

  if (notUpToDate.length > 0) {
    console.log(`\n${notUpToDate.length} databases are not up to date:`);
    notUpToDate.forEach(target => console.log(`  ${target}`));
    process.exitCode = NOT_UP_TO_DATE_EXIT_CODE;

    return;
  }

  console.log("\nevery selected database is up to date 🚀 !!");
};
