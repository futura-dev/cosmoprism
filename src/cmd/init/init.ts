import * as fs from 'node:fs/promises'
import * as fsSync from 'node:fs'
import * as path from 'node:path'

const seedContent = "// TODO: place here seeds 🌱🫛!!"

// 1. create the '.cosmoprism.json' config file
// 2. create 'prisma' directory
// 3. create 'central' and 'tenant' subdirectories
// 4. create 'schema.prisma' files
// 5. create 'seed.ts' files
export const init = async () => {
  const here = __dirname;

  // 1.
  const configContent = await fs.readFile(path.join(here, 'templates', '.cosmoprism.json.template'));
  await fs.writeFile('.cosmoprism.json', configContent);
  // 2.
  if (!fsSync.existsSync('prisma')) {
    await fs.mkdir('prisma');
  }
  // 3.
  if (!fsSync.existsSync('prisma/central')) {
    await fs.mkdir('prisma/central');
  }
  if (!fsSync.existsSync('prisma/tenant')) {
    await fs.mkdir('prisma/tenant');
  }
  // 4.
  const centralContent = await fs.readFile(path.join(here, 'templates', 'central.template'));
  const tenantContent = await fs.readFile(path.join(here, 'templates', 'tenant.template'));
  const centralSchemaPath = path.join('prisma', 'central', 'schema.prisma')
  if (!fsSync.existsSync(centralSchemaPath)) {
    await fs.writeFile(centralSchemaPath, centralContent)
  }
  const tenantSchemaPath = path.join('prisma', 'tenant', 'schema.prisma')
  if (!fsSync.existsSync(tenantSchemaPath)) {
    await fs.writeFile(tenantSchemaPath, tenantContent);
  }
  // 5.
  const centralSeedPath = path.join('prisma', 'central', 'seed.ts');
  if (!fsSync.existsSync(centralSeedPath)) {
    await fs.writeFile(centralSeedPath, seedContent);
  }
  const tenantSeedPath = path.join('prisma', 'tenant', 'seed.ts');
  if (!fsSync.existsSync(tenantSeedPath)) {
    await fs.writeFile(tenantSeedPath, seedContent);
  }
}