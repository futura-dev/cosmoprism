# Migrating to cosmoprism for Prisma ORM 7

This guide takes a project running cosmoprism `0.0.1-alpha.14` or earlier —
built on Prisma ORM 5/6 — to the Prisma ORM 7 release. It is a one-way upgrade:
the two lines address Prisma differently and cannot share a checkout.

Your **migrations are not touched**. They keep living in
`prisma/central/migrations` and `prisma/tenant/migrations`, they keep their
names and checksums, and no database is reset by this upgrade. What changes is
where the connection urls live, how each command is addressed and how the
generated client is imported.

Work through the steps in order — each one leaves the project in a state you can
reason about — then run the [final check](#final-check).

## Table of Contents
- [1. Requirements](#1-requirements)
- [2. Dependencies](#2-dependencies)
- [3. Environment variables](#3-environment-variables)
- [4. One `prisma.config.ts` per context](#4-one-prismaconfigts-per-context)
- [5. Schemas](#5-schemas)
- [6. `.cosmoprism.json`](#6-cosmoprismjson)
- [7. Seeds](#7-seeds)
- [8. The generated client](#8-the-generated-client)
- [9. Commands and flags](#9-commands-and-flags)
- [Final check](#final-check)

## 1. Requirements

Node.js moves from `18.x` to `^20.19 || ^22.12 || >=24.0` — Prisma ORM 7 drops
Node 18. Update your `.nvmrc`, your Docker images and your CI matrix first: with
Node 18 still active, everything below fails on install.

## 2. Dependencies

Prisma is now a **peer dependency**: cosmoprism runs your project's Prisma CLI
and no longer carries one of its own, so the version you install is the version
that runs.

```shell
npm install prisma@^7 tsx --save-dev
npm install @prisma/adapter-pg
npm install @futura-dev/cosmoprism@latest --save-dev
```

`tsx` runs the seeds and the `prisma.config.ts` files. `@prisma/adapter-pg` is
required to instantiate the client (see [step 8](#8-the-generated-client)).

Nothing else changes on your side: cosmoprism dropped `sequelize`, `mysql2` and
`pg-hstore` and reads the tenant registry with `pg` directly, but those were
always its own dependencies.

## 3. Environment variables

Three variables replace the previous two, and every name now ends with the kind
of thing it holds:

| before                     | after                          | used by    |
|----------------------------|--------------------------------|------------|
| `COSMOPRISM_CENTRAL_DB_URL` | `TENANT_REGISTRY_DATABASE_URL` | cosmoprism |
| `DATABASE_CENTRAL_URL`     | `CENTRAL_DATABASE_URL`         | Prisma     |
| `DATABASE_TENANT_URL`      | `TENANT_DATABASE_URL`          | Prisma     |

`TENANT_REGISTRY_DATABASE_URL` points at the database holding your tenant table.
That used to be, by construction, the central database; it no longer has to be,
so if you keep the registry there simply give both variables the same value.

`TENANT_DATABASE_URL` is **injected by cosmoprism**, once per tenant, into the
Prisma process it spawns. Do not set it in `.env`: whatever you write there is
overwritten for every tenant command, and it only ever serves as a fallback for
scripts you run by hand.

```dotenv
TENANT_REGISTRY_DATABASE_URL="postgresql://…/central"
CENTRAL_DATABASE_URL="postgresql://…/central"
```

Prisma ORM 7 no longer reads `.env` itself. Cosmoprism loads it before running a
command, so the CLI keeps working as before — but any script you invoke
yourself, seeds included, has to load it on its own.

## 4. One `prisma.config.ts` per context

This is the heart of the upgrade. Prisma ORM 7 takes schema, migrations, seed
command and connection url from a config file, so cosmoprism addresses every
command by `--config` instead of `--schema`. Create the two files:

`prisma/central/prisma.config.ts`

```ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "schema.prisma",
  migrations: {
    path: "migrations",
    seed: "tsx prisma/central/seed.ts"
  },
  datasource: {
    url: process.env.CENTRAL_DATABASE_URL ?? ""
  }
});
```

`prisma/tenant/prisma.config.ts`

```ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "schema.prisma",
  migrations: {
    path: "migrations",
    seed: "tsx prisma/tenant/seed.ts"
  },
  datasource: {
    url: process.env.TENANT_DATABASE_URL ?? ""
  }
});
```

Two path rules are easy to get wrong: `schema` and `migrations.path` resolve
**relative to the config file's own directory**, while the seed command runs
**from the root of your project**. `migrations: { path: "migrations" }` therefore
points at the directory your migrations already occupy — nothing to move.

The empty-string fallback on the url is deliberate: it keeps `generate`,
`validate` and `format` working when no tenant is selected, since none of them
opens a connection. The commands that do connect still refuse to run, with
`Connection url is empty`.

Running `npx @futura-dev/cosmoprism init` in an existing project writes both
files for you and leaves every schema, seed and migration already on disk
untouched — only `.cosmoprism.json` is overwritten, so save your tenant table
settings first ([step 6](#6-cosmoprismjson)).

## 5. Schemas

Prisma ORM 7 **rejects a schema that declares `url`** in its datasource block,
and the `prisma-client-js` generator is gone. Both schemas shrink to:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../../generated/prisma/central"   // "…/tenant" in the tenant schema
}

datasource db {
  provider = "postgresql"
}
```

Keep your models exactly as they are — the datamodel is unchanged, so no
migration is generated by this edit.

The new generator emits a real TypeScript client into your own source tree
instead of writing inside `node_modules/@prisma/client`. Point `output`
wherever you like and add that directory to `.gitignore`.

## 6. `.cosmoprism.json`

Drop `centralDatabaseUrl`: the connection string now lives in `.env` alone. The
file is validated strictly, so a leftover key is an error rather than a
harmless extra.

```json
{
  "engine": "postgres",
  "tenantTable": {
    "name": "tenant",
    "idAttributeName": "id",
    "databaseUrlAttributeName": "db_url"
  }
}
```

The tenant table itself is unchanged, and it is still read without Prisma: it
needs no schema of its own.

## 7. Seeds

Seeds used to be spawned as `tsx prisma/<context>/seed.ts`. They now run through
`prisma db seed`, which reads the command from the config file you wrote in
[step 4](#4-one-prismaconfigts-per-context) — the script keeps its path, so
nothing moves.

Two things have to change inside a tenant seed:

- read the tenant url from `TENANT_DATABASE_URL`, not `DATABASE_TENANT_URL`
- load `.env` yourself, since Prisma no longer does it for the processes it
  spawns

```ts
import "dotenv/config";
import { PrismaClient } from "../../generated/prisma/tenant/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.TENANT_DATABASE_URL })
});
```

## 8. The generated client

Update every import to the new `output` directory, and give the constructor a
driver adapter — `prisma-client` has no built-in engine-side connection:

```ts
// before
import { PrismaClient } from "@prisma/client/tenant";
const prisma = new PrismaClient({ datasources: { db: { url: tenantUrl } } });

// after
import { PrismaClient } from "../generated/prisma/tenant/client";
import { PrismaPg } from "@prisma/adapter-pg";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: tenantUrl })
});
```

Per-tenant instantiation in your application is otherwise unchanged: one client
per tenant url, exactly as before.

## 9. Commands and flags

**No command runs without a target any more.** The old implicit "no flag means
everything" is gone: a full rollout is now something you asked for in writing.

| target | flag |
|--------|------|
| central | `-c` |
| one tenant | `-t <tenant-id>` |
| pick tenants from a list | `-t`, with no value |
| every tenant | `--all-tenants` |

Selectors also **add up** instead of excluding each other: `-c -t` used to be an
error, and now means central plus the tenants you pick.

| before | after |
|--------|-------|
| `migrate dev` (no flag, meaning everything) | `migrate dev -c --all-tenants` |
| `migrate deploy -t` (prompted, or silently ran on one) | `migrate deploy -t <url>` or `--all-tenants` |
| `generate` | `generate -c -t` |
| `validate --schema prisma/tenant/schema.prisma` | `validate -t` |
| `format --schema prisma/central/schema.prisma` | `format -c` |
| `db seed` | `db seed -c --all-tenants` |

Command-by-command notes:

- **`migrate deploy`** runs unattended and never prompts: `-t` requires a value
  there, and a bare `-t` is refused rather than quietly widening to every
  tenant. It is also the command that gained `--all-tenants`, which is how a
  release now rolls the whole fleet forward.
- **`generate`, `validate`, `format`** lost `--schema` and take `-c` / `-t`
  instead. There the flags select a *schema*, not a database: the tenant schema
  is one file shared by every tenant, so `-t` takes no value, opens no
  connection and `--all-tenants` does not apply. To work on a schema outside the
  two contexts, call Prisma directly with `npx prisma format --schema=<file>`.
- **`studio`** opens exactly one database, so its flags stay a choice rather
  than a sum, and `--all-tenants` does not apply.
- **`migrate status`** and **`migrate diff`** are new, and both are read-only:
  `status` reports one database at a time and exits 1 when any of them is
  behind, `diff --exit-code` exits 2 on a non-empty diff.
- **`--skip-generate` and `--skip-seed`** still exist on `migrate dev` and
  `migrate reset`, but they now opt out of steps *cosmoprism* chains: Prisma ORM
  7 stopped generating and seeding implicitly and dropped its own flags of the
  same name. A migration created with `--create-only` applies nothing, so
  nothing is seeded for it.

One thing worth knowing before you script anything: `-t <tenant-id>` is passed
through as the tenant **connection url**, so it is the value of your
`databaseUrlAttributeName` column that a script has to supply. Only the
interactive form — bare `-t` — lets you pick from the registry by hand.

## Final check

Run these in order, on a copy of production data or a staging environment,
before upgrading anything live:

```shell
npx @futura-dev/cosmoprism validate -c -t     # schemas parse under Prisma ORM 7
npx @futura-dev/cosmoprism generate -c -t     # clients land in their new output
npx @futura-dev/cosmoprism migrate status -c --all-tenants
```

A clean `migrate status` is the sign you are looking for: the upgrade changed no
database state, and the migration history Prisma reads is the one your previous
cosmoprism wrote. If it reports a database as behind, or if
`migrate diff -c --script` prints an unexpected statement, the difference comes
from your schema edits in [step 5](#5-schemas), not from the upgrade — compare
it against your models before applying anything.
