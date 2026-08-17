import {
  ContextTarget,
  configPath,
  contextsFrom,
  runPrisma
} from "../../utils/prisma-cli";

export type ValidateCommand = ContextTarget;

export const validate = async (command: ValidateCommand): Promise<void> => {
  for (const context of contextsFrom(command)) {
    runPrisma(["validate", `--config=${configPath(context)}`]);
    console.log(`validation passed for ${context} 👌\n`);
  }
};
