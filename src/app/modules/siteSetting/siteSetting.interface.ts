import { z } from "zod";
import { SiteSettingValidation } from "./siteSetting.validation.js";

export type THomepageConfig = z.infer<
  typeof SiteSettingValidation.homepageConfigSchema
>;
