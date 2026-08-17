#! /usr/bin/env node
import { program } from "commander";
import * as process from "process";
import { init } from "./cmd/init/init";
import { generate } from "./cmd/generate/generate";
import { validate } from "./cmd/validate/validate";
import { format } from "./cmd/format/format";
import { db } from "./cmd/db";
import { studio } from "./cmd/studio/studio";
import { migrate } from "./cmd/migrate";
import { loadExternalEnv } from "./utils/functions";

// TODO: add custom options processing

// program definition
program
  .name("cosmoprism")
  .alias("cprism")
  .description("Cosmoprism 🔺🧊")
  .version(process.env.npm_package_version ?? "-")
  .hook("preAction", loadExternalEnv);

// ---------------
// command: INIT
// ---------------
program.command("init").action(async () => await init());

// ---------------
// command: GENERATE
// ---------------
program
  .command("generate")
  .option("-c, --central", "Generate the central client.")
  .option("-t, --tenant", "Generate the tenant client.")
  .action(async (...args) => {
    const { tenant, central } = args[0];

    await generate({ central, tenant });
  });

// ---------------
// command: VALIDATE
// ---------------
program
  .command("validate")
  .option("-c, --central", "Validate the central schema.")
  .option("-t, --tenant", "Validate the tenant schema.")
  .action(async (...args) => {
    const { tenant, central } = args[0];

    await validate({ central, tenant });
  });

// ---------------
// command: FORMAT
// ---------------
program
  .command("format")
  .option("-c, --central", "Format the central schema.")
  .option("-t, --tenant", "Format the tenant schema.")
  .option(
    "--check",
    "Fails if any files are unformatted. This can be used in CI to detect if the schema is formatted correctly."
  )
  .action(async (...args) => {
    const { tenant, central, check } = args[0];

    await format({ central, tenant, check: !!check });
  });

// ---------------
// command: DB
// subcommands: seed
// ---------------
const dbCommand = program.command("db");
// dbCommand.command('pull') // TODO: implement
// dbCommand.command('push') // TODO: implement
// dbCommand.command('execute') // TODO: implement
dbCommand
  .command("seed")
  .option("-c, --central", "Seed the central database.")
  .option(
    "-t, --tenant [tenant-id]",
    "Seed one tenant. Without a value, prompts you for a selection."
  )
  .option("--all-tenants", "Seed every tenant of the registry.")
  .action(async (...args) => {
    const { tenant, central, allTenants } = args[0];

    await db.seed({ central, tenant, allTenants });
  });

// ---------------
// command: MIGRATE
// subcommands: dev, reset, deploy
// ---------------
const migrateCommand = program.command("migrate");
// dbCommand.command('resolve') // TODO: implement
// dbCommand.command('status') // TODO: implement
// dbCommand.command('diff') // TODO: implement
// dev
migrateCommand
  .command("dev")
  .option("-c, --central", "Migrate the central database.")
  .option(
    "-t, --tenant [tenant-id]",
    "Migrate one tenant. Without a value, prompts you for a selection."
  )
  .option("--all-tenants", "Migrate every tenant of the registry.")
  .option(
    "-n, --name <name>",
    "The name of the migration. If no name is provided, the CLI will prompt you."
  )
  .option(
    "--create-only",
    "Creates a new migration based on the changes in the schema but does not apply that migration. Run migrate dev to apply migration."
  )
  .option("--skip-seed", "Skip the seed step triggered by cosmoprism.")
  .option(
    "--skip-generate",
    "Skip the generators step triggered by cosmoprism (for example, Prisma Client)"
  )
  .action(async (...args) => {
    const {
      tenant,
      central,
      allTenants,
      name,
      createOnly,
      skipSeed,
      skipGenerate
    } = args[0];

    await migrate.dev({
      central,
      tenant,
      allTenants,
      name,
      createOnly,
      skipGenerate,
      skipSeed
    });
  });
// reset
migrateCommand
  .command("reset")
  .option("-c, --central", "Reset the central database.")
  .option(
    "-t, --tenant [tenant-id]",
    "Reset one tenant. Without a value, prompts you for a selection."
  )
  .option("--all-tenants", "Reset every tenant of the registry.")
  .option("-f, --force", "Skip the confirmation prompt.")
  .option("--skip-seed", "Skip the seed step triggered by cosmoprism.")
  .option(
    "--skip-generate",
    "Skip the generators step triggered by cosmoprism (for example, Prisma Client)"
  )
  .action(async (...args) => {
    const { tenant, central, allTenants, force, skipSeed, skipGenerate } =
      args[0];

    await migrate.reset({
      central,
      tenant,
      allTenants,
      force,
      skipGenerate,
      skipSeed
    });
  });
// deploy
migrateCommand
  .command("deploy")
  .option("-c, --central", "Apply pending migrations to the central database.")
  .option(
    "-t, --tenant <tenant-id>",
    "Apply pending migrations to one tenant. A value is required: this command runs unattended and cannot prompt."
  )
  .option(
    "--all-tenants",
    "Apply pending migrations to every tenant of the registry."
  )
  .action(async (...args) => {
    const { tenant, central, allTenants } = args[0];

    await migrate.deploy({ central, tenant, allTenants });
  });

// ---------------
// command: STUDIO
// ---------------
program
  .command("studio")
  .option(
    "-t, --tenant [tenant-id]",
    "Open one tenant. Without a value, prompts you for a selection."
  )
  .option("-c, --central", "Open the central database.")
  .option("-b, --browser [browser]", "The browser to auto-open Studio in.")
  .option("-p, --port [port]", "The port number to start Studio on.", "5555")
  .action(async (...args) => {
    const { tenant, central, browser, port } = args[0];

    await studio({ central, tenant, browser, port });
  });

// parse program
program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(`\n${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
