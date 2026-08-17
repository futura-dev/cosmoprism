import inquirer from "inquirer";
import { Client } from "pg";
import { loadConfiguration } from "./load-configuration";
import { Target } from "./prisma-cli";

interface Tenant {
  id: string;
  databaseUrl: string;
}

interface TenantChoice {
  name: string;
  value: string;
  description: string;
}

const readTenants = async (): Promise<Tenant[]> => {
  const registryUrl = process.env.TENANT_REGISTRY_DATABASE_URL;
  if (typeof registryUrl !== "string" || registryUrl === "")
    throw new Error(
      "missing $TENANT_REGISTRY_DATABASE_URL in your .env file: it is the " +
        "connection string of the database holding your tenant table"
    );

  const config = await loadConfiguration();

  const client = new Client({ connectionString: registryUrl });
  await client.connect();
  try {
    const { rows } = await client.query(
      `SELECT * FROM "${config.tenantTable.name}";`
    );

    return rows.map(row => ({
      id: String(row[config.tenantTable.idAttributeName]),
      databaseUrl: String(row[config.tenantTable.databaseUrlAttributeName])
    }));
  } finally {
    await client.end();
  }
};

const toChoices = (tenants: Tenant[]): TenantChoice[] =>
  tenants.map(tenant => ({
    name: tenant.databaseUrl,
    value: tenant.databaseUrl,
    description: tenant.id
  }));

export const allTenantUrls = async (): Promise<string[]> =>
  (await readTenants()).map(tenant => tenant.databaseUrl);

export const chooseTenants = async (): Promise<string[]> => {
  const tenants = await readTenants();
  if (tenants.length === 0) return [];

  const { tenantUrls } = await inquirer.prompt<{ tenantUrls: string[] }>({
    name: "tenantUrls",
    type: "checkbox",
    required: true,
    instructions: true,
    message: "Choose a tenant",
    choices: toChoices(tenants)
  });

  return tenantUrls;
};

export const chooseTenant = async (): Promise<string | null> => {
  const tenants = await readTenants();
  if (tenants.length === 0) return null;

  const { tenantUrl } = await inquirer.prompt<{ tenantUrl: string }>({
    name: "tenantUrl",
    type: "select",
    message: "Choose a tenant",
    choices: toChoices(tenants)
  });

  return tenantUrl;
};

export interface ResolvedTarget {
  central: boolean;
  tenantUrls: string[];
}

export const resolveTarget = async (
  target: Target,
  { promptable }: { promptable: boolean }
): Promise<ResolvedTarget> => {
  const central = !!target.central;
  const { tenant } = target;

  if (!central && !tenant && !target.allTenants)
    throw new Error(
      "ERR: nothing selected. Pass '-c' for central, '-t <tenant-id>' for one " +
        "tenant, '--all-tenants' for every tenant, or combine them."
    );
  if (tenant && target.allTenants)
    throw new Error(
      "ERR: '-t' and '--all-tenants' cannot be combined: one names a single " +
        "tenant, the other selects them all."
    );

  if (target.allTenants) return { central, tenantUrls: await allTenantUrls() };
  if (typeof tenant === "string") return { central, tenantUrls: [tenant] };
  if (tenant === true) {
    if (!promptable)
      throw new Error(
        "ERR: '-t' needs a tenant id here. This command cannot prompt, so pass " +
          "'-t <tenant-id>' or '--all-tenants'."
      );
    return { central, tenantUrls: await chooseTenants() };
  }

  return { central, tenantUrls: [] };
};
