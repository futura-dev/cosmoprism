import { spawnSync } from "child_process";
import path from "path";

interface FormatCommand {
  schema?: string;
  check: boolean;
}

export const format = async (command: FormatCommand): Promise<void> => {
  const centralSchemaPath = path.join("prisma", "central", "schema.prisma");
  const tenantSchemaPath = path.join("prisma", "tenant", "schema.prisma");

  const schemasToValidate: string[] = command.schema
    ? [command.schema]
    : [centralSchemaPath, tenantSchemaPath];

  for (const schema of schemasToValidate) {
    const commandArgs = [`--schema=${schema}`];
    if (command.check) commandArgs.push("--check");

    spawnSync("npx", ["prisma", "format", ...commandArgs], {
      shell: true,
      stdio: "inherit",
      env: { ...process.env },
      encoding: "utf-8"
    });
    console.log(`schema: ${schema} formatted 🖋️\n`);
  }
};
