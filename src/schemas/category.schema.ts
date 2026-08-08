import Joi from "joi";
import { CategoryType } from "../entities/category.entity";

export const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  type: Joi.string()
    .valid(...Object.values(CategoryType))
    .required(),
}).unknown(false);

export const getCategoriesSchema = Joi.object({
  page: Joi.number().integer().positive().default(1),
  limit: Joi.number().integer().positive().max(100).default(20),
  type: Joi.string().valid(...Object.values(CategoryType)),
  includeInactive: Joi.boolean().default(false),
}).unknown(false);

export const updateCategorySchema = Joi.object({
  name: Joi.string().trim().min(1).max(100),
  categoryStatus: Joi.boolean(),
})
  .min(1)
  .unknown(false);

export const categoryIdParamSchema = Joi.object({
  id: Joi.string()
    .uuid({ version: ["uuidv4"] })
    .required(),
}).unknown(false);
