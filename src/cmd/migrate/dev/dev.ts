import { spawnSync } from "child_process";
import inquirer from "inquirer";
import path from "path";
import { Sequelize } from "sequelize";
import * as fs from "node:fs/promises";

interface DevCommandTenant {
  mode: "tenant";
  tenant: string | undefined;
  name?: string;
  createOnly?: boolean;
  skipSeed?: boolean;
  skipGenerate?: boolean;
}
interface DevCommandCentral {
  mode: "central";
  name?: string;
  createOnly?: boolean;
  skipSeed?: boolean;
  skipGenerate?: boolean;
}
interface DevCommandAll {
  mode: "all";
  name?: string;
  createOnly?: boolean;
  skipSeed?: boolean;
  skipGenerate?: boolean;
}

export const dev = async (
  command: DevCommandAll | DevCommandCentral | DevCommandTenant
): Promise<void> => {
  if (command.mode === "central" || command.mode === "all") {
    console.log(`\nrunning 'migrate dev' for central ...`);
    // run 'npx prisma migrate dev --schema=./prisma/central/schema.prisma'
    const centralSchemaPath = path.join("prisma", "central", "schema.prisma");
    const commandArgs: string[] = [];
    commandArgs.push(`--schema=${centralSchemaPath}`);
    if (command.name) commandArgs.push(`--name ${command.name}`);
    if (command.createOnly) commandArgs.push(`--create-only`);
    if (command.skipGenerate) commandArgs.push(`--skip-generate`);
    if (command.skipSeed) commandArgs.push(`--skip-seed`);
    spawnSync("npx", ["prisma", "migrate", "dev", ...commandArgs], {
      shell: true,
      stdio: "inherit",
      env: { ...process.env },
      encoding: "utf-8"
    });
    console.log(`running 'migrate dev' for central completed 👌\n`);
  }

  if (command.mode === "all" || command.mode === "tenant") {
    // choose tenant
    const tenantUrls: string[] =
      command.mode !== "all" && typeof command.tenant === "string"
        ? [command.tenant]
        : await chooseTenantPrompt();
    console.log(
      `\nrunning 'migrate dev' for ${tenantUrls.length} tenants ...\n`
    );

    const tenantSchemaPath = path.join("prisma", "tenant", "schema.prisma");
    for (const url of tenantUrls) {
      // run 'npx prisma migrate dev --schema=./prisma/tenant/schema.prisma' with 'DATABASE_TENANT_URL' as current tenant url
      const commandArgs: string[] = [];
      commandArgs.push(`--schema=${tenantSchemaPath}`);
      if (command.name) commandArgs.push(`--name ${command.name}`);
      if (command.createOnly) commandArgs.push(`--create-only`);
      if (command.skipGenerate) commandArgs.push(`--skip-generate`);
      if (command.skipSeed) commandArgs.push(`--skip-seed`);
      spawnSync("npx", ["prisma", "migrate", "dev", ...commandArgs], {
        shell: true,
        stdio: "inherit",
        env: { ...process.env, DATABASE_TENANT_URL: url },
        encoding: "utf-8"
      });
      console.log(url, " completed 👌");
    }
  }

  console.log("\nall done 🚀 !!");
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
      choices: queryResult.map((item: any) => ({
        name: item[config.tenantTable.databaseUrlAttributeName],
        value: item[config.tenantTable.databaseUrlAttributeName],
        description: item[config.tenantTable.idAttributeName]
      }))
    }
  });

  return res.tenantIds;
};
