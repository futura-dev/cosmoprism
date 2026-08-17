import * as fs from "node:fs/promises";
import * as fsSync from "node:fs";
import * as path from "node:path";

const seedContent = "// TODO: place here seeds 🌱🫛!!";

const writeIfMissing = async (
  filePath: string,
  content: string | Buffer
): Promise<void> => {
  if (!fsSync.existsSync(filePath)) {
    await fs.writeFile(filePath, content);
  }
};

// 1. create the '.cosmoprism.json' config file
// 2. create 'prisma' directory
// 3. create 'central' and 'tenant' subdirectories
// 4. create 'schema.prisma' files
// 5. create 'prisma.config.ts' files
// 6. create 'seed.ts' files
export const init = async (): Promise<void> => {
  const here = __dirname;
  const template = (name: string): Promise<Buffer> =>
    fs.readFile(path.join(here, "templates", name));

  // 1.
  await fs.writeFile(
    ".cosmoprism.json",
    await template(".cosmoprism.json.template")
  );
  // 2.
  if (!fsSync.existsSync("prisma")) {
    await fs.mkdir("prisma");
  }
  // 3.
  if (!fsSync.existsSync("prisma/central")) {
    await fs.mkdir("prisma/central");
  }
  if (!fsSync.existsSync("prisma/tenant")) {
    await fs.mkdir("prisma/tenant");
  }
  // 4.
  await writeIfMissing(
    path.join("prisma", "central", "schema.prisma"),
    await template("central.template")
  );
  await writeIfMissing(
    path.join("prisma", "tenant", "schema.prisma"),
    await template("tenant.template")
  );
  // 5.
  await writeIfMissing(
    path.join("prisma", "central", "prisma.config.ts"),
    await template("central.config.template")
  );
  await writeIfMissing(
    path.join("prisma", "tenant", "prisma.config.ts"),
    await template("tenant.config.template")
  );
  // 6.
  await writeIfMissing(path.join("prisma", "central", "seed.ts"), seedContent);
  await writeIfMissing(path.join("prisma", "tenant", "seed.ts"), seedContent);

  console.log(
    "\nSet the env variables $TENANT_REGISTRY_DATABASE_URL and $CENTRAL_DATABASE_URL in your .env file."
  );
};
