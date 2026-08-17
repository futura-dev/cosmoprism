import {
  ContextTarget,
  configPath,
  contextsFrom,
  runPrisma
} from "../../utils/prisma-cli";

export interface FormatCommand extends ContextTarget {
  check: boolean;
}

export const format = async (command: FormatCommand): Promise<void> => {
  for (const context of contextsFrom(command)) {
    const commandArgs = [`--config=${configPath(context)}`];
    if (command.check) commandArgs.push("--check");

    runPrisma(["format", ...commandArgs]);
    console.log(`schema formatted for ${context} 🖋️\n`);
  }
};
