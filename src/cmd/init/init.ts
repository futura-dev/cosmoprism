import * as fs from 'node:fs/promises'
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
  await fs.mkdir('prisma');
  // 3.
  await fs.mkdir('prisma/central');
  await fs.mkdir('prisma/tenant');
  // 4.
  const centralContent = await fs.readFile(path.join(here, 'templates', 'central.template'));
  const tenantContent = await fs.readFile(path.join(here, 'templates', 'tenant.template'));
  await fs.writeFile(path.join('prisma', 'central', 'schema.prisma'), centralContent);
  await fs.writeFile(path.join('prisma', 'tenant', 'schema.prisma'), tenantContent);
  // 5.
  await fs.writeFile(path.join('prisma', 'central', 'seed.ts'), seedContent);
  await fs.writeFile(path.join('prisma', 'tenant', 'seed.ts'), seedContent);
}