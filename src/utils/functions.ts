import * as dotenv from "dotenv";

export const loadExternalEnv = async (): Promise<void> => {
  const envPath = ".env";
  dotenv.config({ path: envPath });
};
