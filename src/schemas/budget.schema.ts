import Joi from "joi";

const uuidSchema = Joi.string().uuid({ version: ["uuidv4"] });
const amountSchema = Joi.number().positive().precision(2);
const budgetDateSchema = Joi.date().iso();

export const createBudgetSchema = Joi.object({
  categoryId: uuidSchema.required(),
  amount: amountSchema.required(),
  month: Joi.number().integer().min(1).max(12).required(),
  year: Joi.number().integer().positive().required(),
}).unknown(false);

export const getBudgetsSchema = Joi.object({
  page: Joi.number().integer().positive().default(1),
  limit: Joi.number().integer().positive().max(100).default(20),
  month: Joi.number().integer().min(1).max(12),
  year: Joi.number().integer().positive(),
})
  .custom((value, helpers) => {
    const hasMonth = value.month !== undefined;
    const hasYear = value.year !== undefined;

    // compare bool
    if (hasMonth !== hasYear) {
      return helpers.error("any.invalid", {
        field: "dateFilter",
        i18nKey: "dateFilter.monthYearTogether",
      });
    }

    return value;
  })
  .unknown(false);

export const getBudgetSchema = Joi.object({
  page: Joi.number().integer().positive().default(1),
  limit: Joi.number().integer().positive().max(100).default(20),
  month: Joi.number().integer().min(1).max(12),
  year: Joi.number().integer().positive(),
  startDate: budgetDateSchema,
  endDate: budgetDateSchema,
})
  .custom((value, helpers) => {
    const hasMonth = value.month !== undefined;
    const hasYear = value.year !== undefined;

    // `month` and `year` must be provided together
    if (hasMonth !== hasYear) {
      return helpers.error("any.invalid", {
        field: "dateFilter",
        i18nKey: "dateFilter.monthYearTogether",
      });
    }

    return value;
  })
  .unknown(false);
