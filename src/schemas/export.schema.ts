import Joi from "joi";
import { TransactionType } from "../entities/transaction.entity";

const uuidSchema = Joi.string().uuid({ version: ["uuidv4"] });
const exportDateSchema = Joi.date().iso();

export const exportFormats = [
  "excel",
  "csv",
  "json",
  "google_sheet",
] as const;

export type ExportFormat = (typeof exportFormats)[number];

export const getExportSchema = Joi.object({
  format: Joi.string()
    .valid(...exportFormats)
    .default("json"),
  accountId: uuidSchema,
  type: Joi.string().valid(...Object.values(TransactionType)),
  month: Joi.number().integer().min(1).max(12),
  year: Joi.number().integer().positive(),
  startDate: exportDateSchema,
  endDate: exportDateSchema,
})
  .custom((value, helpers) => {
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
  })
  .unknown(false);
