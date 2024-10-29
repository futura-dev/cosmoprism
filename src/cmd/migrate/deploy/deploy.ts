import { spawnSync } from "child_process";
import inquirer from "inquirer";
import path from "path";
import { Sequelize } from "sequelize";
import * as fs from "node:fs/promises";

interface DeployCommandTenant {
  mode: "tenant";
  tenant: string | undefined;
}
interface DeployCommandCentral {
  mode: "central";
}
interface DeployCommandAll {
  mode: "all";
}

export const deploy = async (
  command: DeployCommandAll | DeployCommandCentral | DeployCommandTenant
): Promise<void> => {
  if (command.mode === "central" || command.mode === "all") {
    console.log(`\nrunning 'migrate deploy' for central ...`);
    // run 'npx prisma migrate deploy --schema=./prisma/central/schema.prisma'
    const centralSchemaPath = path.join("prisma", "central", "schema.prisma");
    const commandArgs: string[] = [];
    commandArgs.push(`--schema=${centralSchemaPath}`);
    spawnSync("npx", ["prisma", "migrate", "deploy", ...commandArgs], {
      shell: true,
      stdio: "inherit",
      env: { ...process.env },
      encoding: "utf-8"
    });
    console.log(`running 'migrate deploy' for central completed 👌\n`);
  }

  if (command.mode === "all" || command.mode === "tenant") {
    // choose tenant
    const tenantUrls: string[] =
      command.mode !== "all" && typeof command.tenant === "string"
        ? [command.tenant]
        : await chooseTenantPrompt();
    console.log(
      `\nrunning 'migrate deploy' for ${tenantUrls.length} tenants ...\n`
    );

    const tenantSchemaPath = path.join("prisma", "tenant", "schema.prisma");
    for (const url of tenantUrls) {
      // run 'npx prisma migrate deploy --schema=./prisma/tenant/schema.prisma' with 'DATABASE_TENANT_URL' as current tenant url
      const commandArgs: string[] = [];
      commandArgs.push(`--schema=${tenantSchemaPath}`);
      spawnSync("npx", ["prisma", "migrate", "deploy", ...commandArgs], {
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
