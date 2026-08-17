import { configPath, runPrisma } from "../../utils/prisma-cli";
import { chooseTenant } from "../../utils/tenants";

export interface StudioCommand {
  central?: boolean;
  tenant?: string | true;
  browser?: string;
  port?: string;
}

export const studio = async (command: StudioCommand): Promise<void> => {
  const { central, tenant } = command;

  if (!central && !tenant)
    throw new Error(
      "ERR: nothing selected. Pass '-c' for central, or '-t [tenant-id]' for a " +
        "tenant."
    );
  if (central && tenant)
    throw new Error("ERR: Only one of tenant and central can by passed !!");

  const commonArgs: string[] = [];
  if (command.browser) commonArgs.push("--browser", command.browser);
  if (command.port) commonArgs.push("--port", command.port);

  if (central) {
    console.log(`\nrunning studio for 'central' ...`);
    runPrisma(["studio", `--config=${configPath("central")}`, ...commonArgs]);
    return;
  }

  const tenantUrl = typeof tenant === "string" ? tenant : await chooseTenant();

  if (tenantUrl === null) {
    console.log(`\nno tenant found !`);
    return;
  }

  console.log(`\nrunning studio for 'tenant' ...`);
  runPrisma([
    "studio",
    `--config=${configPath("tenant")}`,
    `--url=${tenantUrl}`,
    ...commonArgs
  ]);
};
