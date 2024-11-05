import * as dotenv from "dotenv";
import * as process from "process";

export const loadExternalEnv = async (): Promise<void> => {
  const envPath = ".env";
  dotenv.config({ path: envPath });

  // check required .env variables
  if (typeof process.env.COSMOPRISM_CENTRAL_DB_URL !== "string") {
    throw new Error("missing $COSMOPRISM_CENTRAL_DB_URL in your .env file");
  }
};
