import { spawnSync } from "child_process";
import inquirer from "inquirer";
import path from "path";
import { Sequelize } from "sequelize";
import * as fs from "node:fs/promises";

interface GenerateCommandTenant {
  mode: "tenant";
  tenant: string | undefined;
}
interface GenerateCommandCentral {
  mode: "central";
}
interface GenerateCommandAll {
  mode: "all";
}

// 1.
export const generate = async (
  command: GenerateCommandCentral | GenerateCommandTenant | GenerateCommandAll
): Promise<void> => {
  console.log(`running generate in '${command.mode}' mode !`);

  if (command.mode === "central" || command.mode === "all") {
    console.log(`\nrunning generate for central ...`);
    // run 'npx prisma generate --schema=./prisma/central/schema.prisma'
    const centralSchemaPath = path.join("prisma", "central", "schema.prisma");
    spawnSync("npx", ["prisma", "generate", `--schema=${centralSchemaPath}`], {
      shell: true,
      stdio: "inherit",
      env: { ...process.env },
      encoding: "utf-8"
    });
    console.log(`running generate for central completed 👌\n`);
  }

  if (command.mode === "all" || command.mode === "tenant") {
    // choose tenant
    const tenantUrls: string[] =
      command.mode !== "all" && typeof command.tenant === "string"
        ? [command.tenant]
        : await chooseTenantPrompt();
    console.log(`\nrunning generate for ${tenantUrls.length} tenants ...\n`);

    const tenantSchemaPath = path.join("prisma", "tenant", "schema.prisma");
    for (const url of tenantUrls) {
      // run 'npx prisma generate --schema=./prisma/tenant/schema.prisma' with 'DATABASE_TENANT_URL' as current tenant url
      spawnSync("npx", ["prisma", "generate", `--schema=${tenantSchemaPath}`], {
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
