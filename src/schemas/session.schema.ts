import Joi from "joi";

export const getSessionsSchema = Joi.object({
  page: Joi.number().integer().positive().default(1),
  limit: Joi.number().integer().positive().max(100).default(20),
  includeRevoked: Joi.boolean().default(false),
}).unknown(false);
