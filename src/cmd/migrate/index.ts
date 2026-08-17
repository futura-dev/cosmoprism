import { dev, DevCommand as MigrateDevCommand } from "./dev";
import { reset, ResetCommand as MigrateResetCommand } from "./reset";
import { deploy, DeployCommand as MigrateDeployCommand } from "./deploy";
import { status, StatusCommand as MigrateStatusCommand } from "./status";
import { diff, DiffCommand as MigrateDiffCommand } from "./diff";

export type {
  MigrateDevCommand,
  MigrateResetCommand,
  MigrateDeployCommand,
  MigrateStatusCommand,
  MigrateDiffCommand
};
export const migrate = {
  dev,
  reset,
  deploy,
  status,
  diff
};
