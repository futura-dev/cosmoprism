import path from "path";
import * as fs from "fs/promises";
import { Configuration } from "../types/schema";
import { configurationSchema } from "../validators/config.validator";

export const loadConfiguration = async (): Promise<Configuration> => {
  const configFilePath = path.join(".cosmoprism.json");
  const jsonConfig = JSON.parse(await fs.readFile(configFilePath, "utf-8"));

  return configurationSchema.parse(jsonConfig);
};
