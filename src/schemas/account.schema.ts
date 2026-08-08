import Joi from "joi";
import { AccountCurrency, AccountType } from "../entities/account.entity";

export const createAccountSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  type: Joi.string()
    .valid(...Object.values(AccountType))
    .required(),
  currency: Joi.string()
    .valid(...Object.values(AccountCurrency))
    .optional(),
  openingBalance: Joi.number().precision(2).required(),
}).unknown(false);

export const getAccountsSchema = Joi.object({
  page: Joi.number().integer().positive().default(1),
  limit: Joi.number().integer().positive().max(100).default(20),
}).unknown(false);
