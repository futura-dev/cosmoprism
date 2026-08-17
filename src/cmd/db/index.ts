import { seed, SeedCommand as DbSeedCommand } from "./seed";

export type { DbSeedCommand };
export const db = { seed };
