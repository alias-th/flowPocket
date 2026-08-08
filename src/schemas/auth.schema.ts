import Joi from "joi";
import { PreferredLanguage } from "../entities/user.entity";

export const registerSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  name: Joi.string().trim().min(2).max(100).required(),
  password: Joi.string().min(8).required(),
  preferredLanguage: Joi.string()
    .valid(...Object.values(PreferredLanguage))
    .default(PreferredLanguage.TH),
}).unknown(false);
