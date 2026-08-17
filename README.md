# Cosmoprism 🔺🧊


[![Version](https://img.shields.io/github/v/release//undefined)](https://github.com/futura-dev/cosmoprism)
[![License](https://img.shields.io/github/license//undefined)](https://github.com/futura-dev/cosmoprism/blob//LICENSE)
[![Open Issues](https://img.shields.io/github/issues//undefined)](https://github.com/futura-dev/cosmoprism/issues?q=is%3Aissue+is%3Aopen)
[![Closed Issues](https://img.shields.io/github/issues-closed//undefined)](https://github.com/futura-dev/cosmoprism/issues?q=is%3Aissue+is%3Aclosed)


## Table of Contents
- [Getting Started](#getting-started)
- [Migrating from an earlier version](#migrating-from-an-earlier-version)
- [Example](#example)
- [Code of Conduct](#code-of-conduct)
- [Contributing](#contributing)
- [Support](#support)
- [License](#license)

## Getting Started

### Requirements

- Node.js `^20.19 || ^22.12 || >=24.0`
- Prisma ORM `7.x`, installed in your project (cosmoprism runs your project's Prisma CLI, it does not bundle its own)
- a PostgreSQL central database holding one row per tenant

```shell
npm install prisma@^7 tsx --save-dev
npm install @futura-dev/cosmoprism --save-dev
```

### Setup

```shell
npx @futura-dev/cosmoprism init
```

`init` scaffolds one *context* per database role — `central` holds your tenant
table, `tenant` is the schema replicated across every tenant database:

```
.cosmoprism.json
prisma/
├── central/
│   ├── prisma.config.ts   # schema, migrations and datasource url of the central db
│   ├── schema.prisma
│   └── seed.ts
└── tenant/
    ├── prisma.config.ts   # same, for a single tenant db
    ├── schema.prisma
    └── seed.ts
```

#### Environment variables

Three variables are involved, and only the first two are yours to set:

| variable                       | who sets it | what it points at |
|--------------------------------|-------------|-------------------|
| `TENANT_REGISTRY_DATABASE_URL` | you, in `.env` | the database holding your tenant table, which cosmoprism reads to list the tenants |
| `CENTRAL_DATABASE_URL`         | you, in `.env` | the central datasource, read by `prisma/central/prisma.config.ts` |
| `TENANT_DATABASE_URL`          | **cosmoprism, at run time** | the tenant currently being worked on, read by `prisma/tenant/prisma.config.ts` |

```dotenv
TENANT_REGISTRY_DATABASE_URL="postgresql://…/central"
CENTRAL_DATABASE_URL="postgresql://…/central"
```

`TENANT_DATABASE_URL` is injected into the Prisma process, once per tenant: a
command on ten tenants runs Prisma ten times, each with a different value. Do
not set it in `.env` — whatever you write there is overwritten for every tenant
command, and it only ever serves as a fallback for scripts you run by hand.

Cosmoprism loads `.env` before running a command. Prisma ORM 7 does not, so
scripts you invoke yourself, seeds included, have to load it on their own.

#### The tenant registry

Cosmoprism has to know, for each tenant, the url of its database. It reads them
from a table you already own — your *tenant registry* — and `.cosmoprism.json`
tells it how that table is shaped:

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

| key | meaning |
|-----|---------|
| `engine` | the database the registry runs on. `postgres` is the only supported value |
| `tenantTable.name` | the table listing your tenants, in the database `TENANT_REGISTRY_DATABASE_URL` points at |
| `tenantTable.idAttributeName` | the column identifying a tenant, shown when the CLI asks you to pick one |
| `tenantTable.databaseUrlAttributeName` | the column holding the connection url of that tenant's database |

So the config above expects a table like:

| id        | db_url                            |
|-----------|-----------------------------------|
| `acme`    | `postgresql://…/tenant_acme`      |
| `globex`  | `postgresql://…/tenant_globex`    |

Any other column is ignored: the registry is your table, with your own
constraints and columns, and cosmoprism queries it with `pg` directly rather
than through Prisma — it needs no schema of its own.

It also does not have to be the central database. Keeping it there is the common
case, and then `TENANT_REGISTRY_DATABASE_URL` and `CENTRAL_DATABASE_URL` hold
the same value; point the first somewhere else — a registry shared across
several applications, say — and nothing else changes.

### Targets

Every command is a Prisma command run once per selected database. **No command
runs without a target**: there is deliberately no implicit "run on everything".

| target | flag |
|--------|------|
| central | `-c` |
| one tenant | `-t <tenant-url>` |
| pick tenants from a list | `-t`, with no value |
| every tenant | `--all-tenants` |

Selectors add up, so `-c --all-tenants` is the whole system and `--all-tenants`
alone is every tenant but not central. A `-t` with a value takes the tenant
**connection url**, the one in your `databaseUrlAttributeName` column; a bare
`-t` lets you pick from the registry instead.

Two commands narrow the rules. `migrate deploy` runs unattended and never
prompts, so `-t` requires a value there. `studio` opens exactly one database, so
its flags are a choice rather than a sum and `--all-tenants` does not apply.

On `generate`, `validate` and `format` the flags select a *schema* instead of a
database: the tenant schema is one file shared by every tenant. There `-t` takes
no value, opens no connection and `--all-tenants` does not apply.

### Commands

| command | targets | cosmoprism adds |
|---------|---------|-----------------|
| `migrate dev [-n <name>] [--create-only]` | `-c` `-t` `--all-tenants` | generate + seed after each migration, opted out with `--skip-generate` / `--skip-seed` |
| `migrate deploy` | `-c` `-t <url>` `--all-tenants` | the whole fleet in one command, without prompting |
| `migrate reset [-f]` | `-c` `-t` `--all-tenants` | generate + seed after each reset, same two flags |
| `db seed` | `-c` `-t` `--all-tenants` | |
| `generate` / `validate` / `format [--check]` | `-c` `-t` | |
| `studio [-b <browser>] [-p <port>]` | `-c` or `-t` | |

```shell
# create + apply a migration on central, then generate and seed
npx @futura-dev/cosmoprism migrate dev -c -n add_users
# same, on tenants you pick from a list
npx @futura-dev/cosmoprism migrate dev -t -n add_users

# the deploy-time command: central, then every tenant
npx @futura-dev/cosmoprism migrate deploy -c --all-tenants
# one tenant only, by connection url
npx @futura-dev/cosmoprism migrate deploy -t "postgresql://…"

npx @futura-dev/cosmoprism migrate reset -c -f
npx @futura-dev/cosmoprism db seed --all-tenants
npx @futura-dev/cosmoprism generate -c -t
npx @futura-dev/cosmoprism studio -c
```

### How it works

- A tenant is targeted by exporting `$TENANT_DATABASE_URL` to the Prisma
  process, the one way that works across every Prisma command. Your
  `prisma/tenant/prisma.config.ts` reads it, so nothing else has to know which
  tenant is running.
- Prisma ORM 7 no longer generates the client nor seeds implicitly after a
  migration. Cosmoprism chains both steps itself, so `migrate dev` and
  `migrate reset` leave every selected database ready to use.
- Your project's Prisma CLI is the one that runs. Cosmoprism bundles none, and
  anything it does not cover stays available by calling Prisma directly.

## Migrating from an earlier version

Projects on a cosmoprism release built for Prisma ORM 5/6 have a one-way upgrade
to make: connection urls move to `prisma.config.ts`, the env variables are
renamed and every command now needs an explicit target. Migrations and databases
are untouched. [MIGRATION.md](MIGRATION.md) walks through it step by step.

## Example

## Code of Conduct
As contributors and maintainers of this open-source web project, we pledge to provide a welcoming and inclusive environment for everyone. We value the participation of individuals from diverse backgrounds and perspectives and aim to foster a respectful and harassment-free community.

To ensure a positive experience for all community members, we have established the following code of conduct that applies to all project-related activities and interactions, both online and offline. By participating in this project, you are expected to uphold these [guidelines](https://github.com/futura-dev/cosmoprism/blob//CODE_OF_CONDUCT.md).

## Contributing
Thank you for considering contributing to this open-source web project! We appreciate your interest and support. To ensure a smooth collaboration process, please follow the [guidelines](https://github.com/futura-dev/cosmoprism/blob//CONTRIBUTING.md)

## Support

If you need assistance, have questions, or want to provide feedback related to this open-source web project, there are several ways to get support:

- **Issue Tracker**: Check the project's issue tracker on [GitHub](https://github.com/futura-dev/cosmoprism/issues) to see if your question or issue has already been addressed. If not, feel free to open a new issue with a detailed description.

- **Email**: You can also reach out to the project maintainers directly via email at opensource@futura-dev.com. Please allow for a reasonable response time.

Before seeking support, make sure to review the project's documentation and readme file, as they may contain helpful information and answers to common questions.

When seeking support or reporting issues, please provide as much relevant information as possible, such as the version of the project you are using, the steps to reproduce the problem, and any error messages encountered. This will help us better understand and assist you with your query.

While we strive to provide timely and helpful support, please note that response times may vary depending on the availability of project maintainers and the complexity of the issue.

We appreciate your interest in this project and look forward to assisting you!

## License
This project is under MIT License. Please check our [LICENSE](https://github.com/futura-dev/cosmoprism/blob//LICENSE) page.
