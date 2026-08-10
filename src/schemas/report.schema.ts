import Joi from "joi";
import { TransactionType } from "../entities/transaction.entity";

const uuidSchema = Joi.string().uuid({ version: ["uuidv4"] });
const reportDateSchema = Joi.date().iso();
const reportTransactionTypes = [
  TransactionType.INCOME,
  TransactionType.EXPENSE,
];

const reportDateFilterSchema = Joi.object({
  month: Joi.number().integer().min(1).max(12),
  year: Joi.number().integer().positive(),
  startDate: reportDateSchema,
  endDate: reportDateSchema,
}).custom((value, helpers) => {
  const hasMonth = value.month !== undefined;
  const hasYear = value.year !== undefined;
  const hasMonthYear = hasMonth || hasYear;
  const hasDateRange =
    value.startDate !== undefined || value.endDate !== undefined;

  if (hasMonth !== hasYear) {
    return helpers.error("any.invalid", {
      field: "dateFilter",
      i18nKey: "dateFilter.monthYearTogether",
    });
  }

  if (hasMonthYear && hasDateRange) {
    return helpers.error("any.invalid", {
      field: "dateFilter",
      i18nKey: "dateFilter.conflict",
    });
  }

  if (
    value.startDate !== undefined &&
    value.endDate !== undefined &&
    value.startDate > value.endDate
  ) {
    return helpers.error("any.invalid", {
      field: "dateFilter",
      i18nKey: "dateFilter.invalidRange",
    });
  }

  return value;
});

export const getReportSummarySchema = reportDateFilterSchema
  .keys({
    accountId: uuidSchema,
  })
  .unknown(false);

export const getReportCategoriesSchema = reportDateFilterSchema
  .keys({
    page: Joi.number().integer().positive().default(1),
    limit: Joi.number().integer().positive().max(100).default(20),
    type: Joi.string()
      .valid(...reportTransactionTypes)
      .default(TransactionType.EXPENSE),
    accountId: uuidSchema,
  })
  .unknown(false);

export const getReportDailyAllowanceSchema = Joi.object({}).unknown(false);

export const getReportDailyBudgetSchema = Joi.object({}).unknown(false);
