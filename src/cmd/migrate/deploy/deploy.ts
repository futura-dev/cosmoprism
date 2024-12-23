import { spawnSync } from "child_process";
import path from "path";
import { Sequelize } from "sequelize";
import { loadConfiguration } from "../../../utils/load-configuration";

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

export type DeployCommand =
  | DeployCommandAll
  | DeployCommandCentral
  | DeployCommandTenant;

export const deploy = async (command: DeployCommand): Promise<void> => {
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
        : await allTenants();
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
const allTenants = async (): Promise<string[]> => {
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

  return queryResult.map(
    (item: any) => item[config.tenantTable.databaseUrlAttributeName]
  );
};
