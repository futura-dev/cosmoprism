import { dev, DevCommand as MigrateDevCommand } from "./dev";
import { reset, ResetCommand as MigrateResetCommand } from "./reset";
import { deploy, DeployCommand as MigrateDeployCommand } from "./deploy";

export type { MigrateDevCommand, MigrateResetCommand, MigrateDeployCommand };
export const migrate = {
  dev,
  reset,
  deploy
};
