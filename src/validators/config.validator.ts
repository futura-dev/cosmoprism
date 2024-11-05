import { z } from "zod";

export const configurationSchema = z
  .object({
    engine: z.literal("postgres"),
    tenantTable: z.object({
      name: z.string(),
      idAttributeName: z.string(),
      databaseUrlAttributeName: z.string()
    })
  })
  .strict();
