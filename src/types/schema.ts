import { z } from "zod";
import { configurationSchema } from "../validators/config.validator";

export type Configuration = z.infer<typeof configurationSchema>;
