import { spawnSync } from "child_process";
import inquirer from "inquirer";
import path from "path";
import { Sequelize } from "sequelize";
import * as fs from "node:fs/promises";
import { loadConfiguration } from "../../../utils/load-configuration";

interface ResetCommandTenant {
  mode: "tenant";
  tenant: string | undefined;
  force?: boolean;
  skipSeed?: boolean;
  skipGenerate?: boolean;
}
interface ResetCommandCentral {
  mode: "central";
  force?: boolean;
  skipSeed?: boolean;
  skipGenerate?: boolean;
}
interface ResetCommandAll {
  mode: "all";
  force?: boolean;
  skipSeed?: boolean;
  skipGenerate?: boolean;
}

export type ResetCommand =
  | ResetCommandAll
  | ResetCommandCentral
  | ResetCommandTenant;

export const reset = async (command: ResetCommand): Promise<void> => {
  if (command.mode === "central" || command.mode === "all") {
    console.log(`\nrunning 'migrate reset' for central ...`);
    // run 'npx prisma migrate reset --schema=./prisma/central/schema.prisma'
    const centralSchemaPath = path.join("prisma", "central", "schema.prisma");
    const commandArgs: string[] = [];
    commandArgs.push(`--schema=${centralSchemaPath}`);
    if (command.force) commandArgs.push(`--force`);
    if (command.skipGenerate) commandArgs.push(`--skip-generate`);
    if (command.skipSeed) commandArgs.push(`--skip-seed`);
    spawnSync("npx", ["prisma", "migrate", "reset", ...commandArgs], {
      shell: true,
      stdio: "inherit",
      env: { ...process.env },
      encoding: "utf-8"
    });
    console.log(`running 'migrate reset' for central completed 👌\n`);
  }

  if (command.mode === "all" || command.mode === "tenant") {
    // choose tenant
    const tenantUrls: string[] =
      command.mode !== "all" && typeof command.tenant === "string"
        ? [command.tenant]
        : await chooseTenantPrompt();
    console.log(
      `\nrunning 'migrate reset' for ${tenantUrls.length} tenants ...\n`
    );

    const tenantSchemaPath = path.join("prisma", "tenant", "schema.prisma");
    for (const url of tenantUrls) {
      // run 'npx prisma migrate reset --schema=./prisma/tenant/schema.prisma' with 'DATABASE_TENANT_URL' as current tenant url
      const commandArgs: string[] = [];
      commandArgs.push(`--schema=${tenantSchemaPath}`);
      if (command.force) commandArgs.push(`force`);
      if (command.skipGenerate) commandArgs.push(`--skip-generate`);
      if (command.skipSeed) commandArgs.push(`--skip-seed`);
      spawnSync("npx", ["prisma", "migrate", "reset", ...commandArgs], {
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
  if (typeof process.env.COSMOPRISM_CENTRAL_DB_URL !== "string")
    throw new Error("missing COSMOPRISM_CENTRAL_DB_URL in .env file");

  const config = await loadConfiguration();

  const sequelize = new Sequelize(process.env.COSMOPRISM_CENTRAL_DB_URL, {
    dialect: "postgres"
  });
  const queryExecution = await sequelize.query(
    `SELECT * FROM "${config.tenantTable.name}";`,
    { logging: false }
  );
  const queryResult = queryExecution[0];
  if (!queryResult || queryResult.length === 0) {
    return [];
  }

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
