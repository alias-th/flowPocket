import Joi from "joi";
import { TransactionType } from "../entities/transaction.entity";

const transactionTypes = [TransactionType.INCOME, TransactionType.EXPENSE];

const uuidSchema = Joi.string().uuid({ version: ["uuidv4"] });
const amountSchema = Joi.number().positive().precision(2);
const transactionDateSchema = Joi.date().iso();

export const supportedImageMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const createTransactionSchema = Joi.object({
  accountId: uuidSchema.required(),
  categoryId: uuidSchema.optional(),
  type: Joi.string()
    .valid(...transactionTypes)
    .required(),
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
  .custom((value, helpers) => {
    const hasMonth = value.month !== undefined;
    const hasYear = value.year !== undefined;
    const hasMonthYear = hasMonth || hasYear;

    const hasDateRange =
      value.startDate !== undefined || value.endDate !== undefined;

    // `month` and `year` must be provided together
    if (hasMonth !== hasYear) {
      return helpers.error("any.invalid", {
        field: "dateFilter",
        i18nKey: "dateFilter.monthYearTogether",
      });
    }

    // Do not allow `month`/`year` together with `startDate`/`endDate`
    if (hasMonthYear && hasDateRange) {
      return helpers.error("any.invalid", {
        field: "dateFilter",
        i18nKey: "dateFilter.conflict",
      });
    }

    if (
      value.startDate !== undefined &&
      value.endDate !== undefined &&
      value.startDate > value.endDate // `startDate` must not be after `endDate`
    ) {
      return helpers.error("any.invalid", {
        field: "dateFilter",
        i18nKey: "dateFilter.invalidRange",
      });
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

export const uploadImagesParamsSchema = transactionIdParamSchema;

export const uploadImageFileSchema = Joi.object({
  fieldname: Joi.string().valid("files").required(),
  filename: Joi.string().trim().min(1).max(255).required(),
  mimetype: Joi.string()
    .valid(...supportedImageMimeTypes)
    .required(),
  size: Joi.number()
    .integer()
    .positive()
    .max(5 * 1024 * 1024)
    .required(),
}).unknown(false);
