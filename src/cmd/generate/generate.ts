import {
  ContextTarget,
  contextsFrom,
  prismaGenerate
} from "../../utils/prisma-cli";

export type GenerateCommand = ContextTarget;

export const generate = async (command: GenerateCommand): Promise<void> => {
  for (const context of contextsFrom(command)) {
    console.log(`\nrunning generate for ${context} ...`);
    prismaGenerate(context);
    console.log(`running generate for ${context} completed 👌\n`);
  }

  console.log("\nall done 🚀 !!");
};
