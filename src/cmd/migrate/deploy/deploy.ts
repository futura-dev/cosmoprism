import {
  TENANT_DB_URL_ENV,
  Target,
  configPath,
  runPrisma
} from "../../../utils/prisma-cli";
import { resolveTarget } from "../../../utils/tenants";

export type DeployCommand = Target;

export const deploy = async (command: DeployCommand): Promise<void> => {
  const { central, tenantUrls } = await resolveTarget(command, {
    promptable: false
  });

  if (central) {
    console.log(`\nrunning 'migrate deploy' for central ...`);
    runPrisma(["migrate", "deploy", `--config=${configPath("central")}`]);
    console.log(`running 'migrate deploy' for central completed 👌\n`);
  }

  if (tenantUrls.length > 0) {
    console.log(
      `\nrunning 'migrate deploy' for ${tenantUrls.length} tenants ...\n`
    );

    for (const url of tenantUrls) {
      runPrisma(["migrate", "deploy", `--config=${configPath("tenant")}`], {
        [TENANT_DB_URL_ENV]: url
      });
      console.log(url, " completed 👌");
    }
  }

  console.log("\nall done 🚀 !!");
};
