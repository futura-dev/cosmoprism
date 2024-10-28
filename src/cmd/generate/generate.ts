import { spawnSync } from "child_process";
import path from "path";

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
    console.log(`\nrunning generate for tenant ...\n`);

    const tenantSchemaPath = path.join("prisma", "tenant", "schema.prisma");
    // run 'npx prisma generate --schema=./prisma/tenant/schema.prisma'
    spawnSync("npx", ["prisma", "generate", `--schema=${tenantSchemaPath}`], {
      shell: true,
      stdio: "inherit",
      env: { ...process.env },
      encoding: "utf-8"
    });
    console.log(`running generate for tenant completed 👌\n`);
  }

  console.log("\nall done 🚀 !!");
};
