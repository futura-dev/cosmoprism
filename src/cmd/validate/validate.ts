import { spawnSync } from "child_process";
import path from "path";

interface ValidateCommand {
  schema?: string;
}

export const validate = async (command: ValidateCommand): Promise<void> => {
  const centralSchemaPath = path.join("prisma", "central", "schema.prisma");
  const tenantSchemaPath = path.join("prisma", "tenant", "schema.prisma");

  const schemasToValidate: string[] = command.schema
    ? [command.schema]
    : [centralSchemaPath, tenantSchemaPath];

  for (const schema of schemasToValidate) {
    const commandArgs = [`--schema=${schema}`];

    spawnSync("npx", ["prisma", "validate", ...commandArgs], {
      shell: true,
      stdio: "inherit",
      env: { ...process.env },
      encoding: "utf-8"
    });
    console.log(`validation passed for schema: ${schema} 👌\n`);
  }
};
