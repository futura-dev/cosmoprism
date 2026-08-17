import * as dotenv from "dotenv";

export const loadExternalEnv = async (): Promise<void> => {
  dotenv.config({ path: ".env", quiet: true });
};
