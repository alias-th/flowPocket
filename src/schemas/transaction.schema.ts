import Joi from "joi";
import { TransactionType } from "../entities/transaction.entity";

const transactionTypes = [TransactionType.INCOME, TransactionType.EXPENSE];

const uuidSchema = Joi.string().uuid({ version: ["uuidv4"] });
const amountSchema = Joi.number().positive().precision(2);
const transactionDateSchema = Joi.date().iso();

export const createTransactionSchema = Joi.object({
  accountId: uuidSchema.required(),
  categoryId: uuidSchema.optional(),
  type: Joi.string().valid(...transactionTypes).required(),
  amount: amountSchema.required(),
  note: Joi.string().trim().optional(),
  transactionDate: transactionDateSchema.required(),
}).unknown(false);

export const getTransactionsSchema = Joi.object({
  page: Joi.number().integer().positive().default(1),
  limit: Joi.number().integer().positive().max(100).default(20),
  type: Joi.string().valid(...Object.values(TransactionType)),
  accountId: uuidSchema,
  month: Joi.number().integer().min(1).max(12),
  year: Joi.number().integer().positive(),
  startDate: transactionDateSchema,
  endDate: transactionDateSchema,
})
  .and("month", "year")
  .custom((value, helpers) => {
    if ((value.month || value.year) && (value.startDate || value.endDate)) {
      return helpers.error("any.invalid");
    }

    if (value.startDate && value.endDate && value.startDate > value.endDate) {
      return helpers.error("any.invalid");
    }

    return value;
  })
  .unknown(false);

export const updateTransactionSchema = Joi.object({
  accountId: uuidSchema,
  categoryId: uuidSchema.allow(null),
  type: Joi.string().valid(...transactionTypes),
  amount: amountSchema,
  note: Joi.string().trim().allow(null),
  transactionDate: transactionDateSchema,
})
  .min(1)
  .unknown(false);

export const transactionIdParamSchema = Joi.object({
  id: uuidSchema.required(),
}).unknown(false);
