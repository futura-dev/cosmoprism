import { migrate, MigrateDevCommand, MigrateDeployCommand, MigrateResetCommand } from "@futura-dev/cosmoprism/migrate";

migrate.dev({ mode: 'all' } satisfies MigrateDevCommand)
migrate.deploy({ mode: 'tenant', tenant: 'fake-tenant' } satisfies MigrateDeployCommand)
migrate.reset({ mode: 'central' } satisfies MigrateResetCommand)
