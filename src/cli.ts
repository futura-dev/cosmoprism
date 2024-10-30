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
  .option("-t, --tenant [tenant-id]", "Apply generate command only for tenant.")
  .option("-c, --central", "Apply generate command only for central.")
  .action(async (...args) => {
    const { tenant, central } = args[0];
    if (!!tenant && !!central)
      throw new Error("ERR: Only one of tenant and central can by passed !!");

    await generate(
      !central && !tenant
        ? { mode: "all" }
        : central
          ? { mode: "central" }
          : { mode: "tenant", tenant }
    );
  });

// ---------------
// command: VALIDATE
// ---------------
program
  .command("validate")
  .option("--schema [file]", "Schema to validate.")
  .action(async (...args) => {
    const { schema } = args[0];

    await validate({ schema });
  });

// ---------------
// command: FORMAT
// ---------------
program
  .command("format")
  .option("--schema [file]", "Schema to validate.")
  .option(
    "--check",
    "	Fails if any files are unformatted. This can be used in CI to detect if the schema is formatted correctly."
  )
  .action(async (...args) => {
    const { schema, check } = args[0];

    await format({ schema, check: !!check });
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
  .option("-t, --tenant [tenant-id]", "Apply generate command only for tenant.")
  .option("-c, --central", "Apply generate command only for central.")
  .action(async (...args) => {
    const { tenant, central } = args[0];
    if (!!tenant && !!central)
      throw new Error("ERR: Only one of tenant and central can by passed !!");

    await db.seed(
      !central && !tenant
        ? { mode: "all" }
        : central
          ? { mode: "central" }
          : { mode: "tenant", tenant }
    );
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
  .option("-t, --tenant [tenant-id]", "Apply generate command only for tenant.")
  .option("-c, --central", "Apply generate command only for central.")
  .option(
    "-n, --name <name>",
    "The name of the migration. If no name is provided, the CLI will prompt you."
  )
  .option(
    "--create-only",
    "Creates a new migration based on the changes in the schema but does not apply that migration. Run migrate dev to apply migration."
  )
  .option("--skip-seed", "Skip triggering seed.")
  .option(
    "--skip-generate",
    "Skip triggering generators (for example, Prisma Client)"
  )
  .action(async (...args) => {
    const { tenant, central, name, createOnly, skipSeed, skipGenerate } =
      args[0];
    if (!!tenant && !!central)
      throw new Error("ERR: Only one of tenant and central can by passed !!");

    await migrate.dev(
      !central && !tenant
        ? { mode: "all", name, createOnly, skipGenerate, skipSeed }
        : central
          ? { mode: "central", name, createOnly, skipGenerate, skipSeed }
          : { mode: "tenant", tenant, name, createOnly, skipGenerate, skipSeed }
    );
  });
// reset
migrateCommand
  .command("reset")
  .option("-t, --tenant [tenant-id]", "Apply generate command only for tenant.")
  .option("-c, --central", "Apply generate command only for central.")
  .option("-f, --force", "Skip the confirmation prompt.")
  .option("--skip-seed", "Skip triggering seed.")
  .option(
    "--skip-generate",
    "Skip triggering generators (for example, Prisma Client)"
  )
  .action(async (...args) => {
    const { tenant, central, force, skipSeed, skipGenerate } = args[0];
    if (!!tenant && !!central)
      throw new Error("ERR: Only one of tenant and central can by passed !!");

    await migrate.reset(
      !central && !tenant
        ? { mode: "all", force, skipGenerate, skipSeed }
        : central
          ? { mode: "central", force, skipGenerate, skipSeed }
          : { mode: "tenant", tenant, force, skipGenerate, skipSeed }
    );
  });
// deploy
migrateCommand
  .command("deploy")
  .option("-t, --tenant [tenant-id]", "Apply generate command only for tenant.")
  .option("-c, --central", "Apply generate command only for central.")
  .action(async (...args) => {
    const { tenant, central } = args[0];
    if (!!tenant && !!central)
      throw new Error("ERR: Only one of tenant and central can by passed !!");

    await migrate.deploy(
      !central && !tenant
        ? { mode: "all" }
        : central
          ? { mode: "central" }
          : { mode: "tenant", tenant }
    );
  });

// ---------------
// command: STUDIO
// ---------------
program
  .command("studio")
  .option("-t, --tenant [tenant-id]", "Apply generate command only for tenant.")
  .option("-c, --central", "Apply generate command only for central.")
  .option("-b, --browser [browser]", "The browser to auto-open Studio in.")
  .option("-p, --port [port]", "The port number to start Studio on.", "5555")
  .action(async (...args) => {
    const { tenant, central, browser, port } = args[0];
    if (!!tenant && !!central)
      throw new Error("ERR: Only one of tenant and central can by passed !!");

    await studio(
      central
        ? { mode: "central", browser, port }
        : { mode: "tenant", tenant, browser, port }
    );
  });

// parse program
program.parse(process.argv);
