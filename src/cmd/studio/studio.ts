import { spawnSync } from "child_process";
import inquirer from "inquirer";
import path from "path";
import { Sequelize } from "sequelize";
import * as fs from "node:fs/promises";
import { loadConfiguration } from "../../utils/load-configuration";

interface StudioCommandTenant {
  mode: "tenant";
  tenant: string | undefined;
  browser?: string;
  port?: string;
}
interface StudioCommandCentral {
  mode: "central";
  browser?: string;
  port?: string;
}

export const studio = async (
  command: StudioCommandTenant | StudioCommandCentral
): Promise<void> => {
  if (command.mode === "central") {
    console.log(`\nrunning studio for 'central' ...`);
    // run 'npx prisma studio --schema=./prisma/central/schema.prisma'
    const centralSchemaPath = path.join("prisma", "central", "schema.prisma");
    const commandArgs: string[] = [];
    commandArgs.push(`--schema=${centralSchemaPath}`);
    if (command.browser) commandArgs.push(`--browser ${command.browser}`);
    if (command.port) commandArgs.push(`--port ${command.port}`);
    spawnSync("npx", ["prisma", "studio", ...commandArgs], {
      shell: true,
      stdio: "inherit",
      env: { ...process.env },
      encoding: "utf-8"
    });
  }

  if (command.mode === "tenant") {
    // choose tenant
    const tenantUrl: string | null =
      typeof command.tenant === "string"
        ? command.tenant
        : await chooseTenantPrompt();

    if (tenantUrl === null) {
      console.log(`\nno tenant found !`);
      return;
    }

    const tenantSchemaPath = path.join("prisma", "tenant", "schema.prisma");
    console.log(`\nrunning studio for 'tenant' ...`);
    // run 'npx prisma studio --schema=./prisma/tenant/schema.prisma' with 'DATABASE_TENANT_URL' as current tenant url
    const commandArgs: string[] = [];
    commandArgs.push(`--schema=${tenantSchemaPath}`);
    if (command.browser) commandArgs.push(`--browser ${command.browser}`);
    if (command.port) commandArgs.push(`--port ${command.port}`);
    spawnSync("npx", ["prisma", "studio", ...commandArgs], {
      shell: true,
      stdio: "inherit",
      env: { ...process.env, DATABASE_TENANT_URL: tenantUrl },
      encoding: "utf-8"
    });
  }

  return;
};

// TODO: move from here
const chooseTenantPrompt = async (): Promise<string | null> => {
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
    return null;
  }

  const res = await inquirer.prompt({
    name: "tenantUrl",
    type: "select",
    message: "Choose a tenant",
    choices: queryResult.map((item: any) => ({
      name: item[config.tenantTable.databaseUrlAttributeName],
      value: item[config.tenantTable.databaseUrlAttributeName],
      description: item[config.tenantTable.idAttributeName]
    }))
  });

  return res.tenantUrl;
};
