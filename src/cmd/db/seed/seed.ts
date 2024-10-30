import { spawnSync } from "child_process";
import inquirer from "inquirer";
import path from "path";
import { Sequelize } from "sequelize";
import * as fs from "node:fs/promises";

interface SeedCommandTenant {
  mode: "tenant";
  tenant: string | undefined;
}
interface SeedCommandCentral {
  mode: "central";
}
interface SeedCommandAll {
  mode: "all";
}

export type SeedCommand =
  | SeedCommandAll
  | SeedCommandCentral
  | SeedCommandTenant;

export const seed = async (command: SeedCommand): Promise<void> => {
  if (command.mode === "central" || command.mode === "all") {
    console.log(`\nrunning db seed for central ...`);
    // run 'npx tsx prisma/central/seed.ts'
    const centralSeedPath = path.join("prisma", "central", "seed.ts");
    spawnSync("npx", ["tsx", centralSeedPath], {
      shell: true,
      stdio: "inherit",
      env: { ...process.env },
      encoding: "utf-8"
    });
    console.log(`running db seed for central completed 🌱\n`);
  }

  if (command.mode === "all" || command.mode === "tenant") {
    // choose tenant
    const tenantUrls: string[] =
      command.mode !== "all" && typeof command.tenant === "string"
        ? [command.tenant]
        : await chooseTenantPrompt();
    console.log(`\nrunning db seed for ${tenantUrls.length} tenants ...\n`);

    const tenantSeedPath = path.join("prisma", "tenant", "seed.ts");
    for (const url of tenantUrls) {
      // run 'npx tsx prisma/tenant/seed.ts' with 'DATABASE_TENANT_URL' as current tenant url
      spawnSync("npx", ["tsx", tenantSeedPath], {
        shell: true,
        stdio: "inherit",
        env: { ...process.env, DATABASE_TENANT_URL: url },
        encoding: "utf-8"
      });
      console.log(url, " completed 🌱");
    }
  }

  console.log("\nall done 🌱🚀 !!");
  return;
};

// TODO: move from here
const chooseTenantPrompt = async (): Promise<string[]> => {
  // TODO: retrieve tenants
  const configFilePath = path.join(".cosmoprism.json");
  const config = JSON.parse(await fs.readFile(configFilePath, "utf-8"));

  const sequelize = new Sequelize(config.centralDatabaseUrl);
  const queryExecution = await sequelize.query(
    `SELECT * FROM "${config.tenantTable.name}";`,
    { logging: false }
  );
  const queryResult = queryExecution[0];

  const res = await inquirer.prompt({
    tenantIds: {
      type: "checkbox",
      required: true,
      instructions: true,
      message: "Choose a tenant",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      choices: queryResult.map((item: any) => ({
        name: item[config.tenantTable.databaseUrlAttributeName],
        value: item[config.tenantTable.databaseUrlAttributeName],
        description: item[config.tenantTable.idAttributeName]
      }))
    }
  });

  return res.tenantIds;
};
