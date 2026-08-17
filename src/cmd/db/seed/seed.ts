import {
  TENANT_DB_URL_ENV,
  Target,
  prismaSeed
} from "../../../utils/prisma-cli";
import { resolveTarget } from "../../../utils/tenants";

export type SeedCommand = Target;

export const seed = async (command: SeedCommand): Promise<void> => {
  const { central, tenantUrls } = await resolveTarget(command, {
    promptable: true
  });

  if (central) {
    console.log(`\nrunning db seed for central ...`);
    prismaSeed("central");
    console.log(`running db seed for central completed 🌱\n`);
  }

  if (tenantUrls.length > 0) {
    console.log(`\nrunning db seed for ${tenantUrls.length} tenants ...\n`);

    for (const url of tenantUrls) {
      prismaSeed("tenant", { [TENANT_DB_URL_ENV]: url });
      console.log(url, " completed 🌱");
    }
  }

  console.log("\nall done 🌱🚀 !!");
};
