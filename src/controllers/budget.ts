import { FastifyReply, FastifyRequest } from "fastify";
import { validateAndThrowError } from "../utils/validation";
import { createBudgetSchema } from "../schemas/budget.schema";
import { checkNotNullUserId } from "../utils/common";
import { getAppDataSource } from "../data-source";
import { Category, CategoryType } from "../entities/category.entity";
import { AppError, isBudgetUniqueViolation } from "../utils/app-error";
import { Budget } from "../entities/budget.entity";
import { success } from "../utils/response";

interface CreateBudgetBody {
  categoryId: string;
  amount: number;
  month: number;
  year: number;
}
export const createBudget = async (
  request: FastifyRequest<{ Body: CreateBudgetBody }>,
  reply: FastifyReply,
) => {
  // Validate request body
  const body = validateAndThrowError<CreateBudgetBody>(
    createBudgetSchema,
    request.body,
    request.t,
  );
  const { amount, categoryId, month, year } = body;
  const userId = checkNotNullUserId(request);

  // Get datasource
  const datasource = getAppDataSource();

  // Find an active expense category
  const expenseCategory = await datasource.getRepository(Category).findOneBy({
    id: categoryId,
    userId,
    categoryStatus: true,
    type: CategoryType.EXPENSE,
  });
  if (!expenseCategory) {
    throw new AppError(404, request.t("category.notFound"));
  }

  // Check whether a budget already exists
  const alreadyExistsBudget = await datasource.getRepository(Budget).findOneBy({
    userId: expenseCategory.userId,
    categoryId: expenseCategory.id,
    month: body.month,
    year: body.year,
  });
  if (alreadyExistsBudget) {
    throw new AppError(409, request.t("budget.alreadyExists"));
  }

  // Create a budget
  try {
    const budgetEntity = datasource.getRepository(Budget).create({
      userId,
      categoryId: expenseCategory.id,
      amount: String(amount),
      month: month,
      year: year,
    });
    const createdBudget = await datasource
      .getRepository(Budget)
      .save(budgetEntity);

    // Response
    return reply.code(201).send(
      success(request.t("budget.create.success"), {
        id: createdBudget.id,
        categoryId: createdBudget.categoryId,
        amount: createdBudget.amount,
        month: createdBudget.month,
        year: createdBudget.year,
      }),
    );
  } catch (error) {
    if (isBudgetUniqueViolation(error)) {
      throw new AppError(409, request.t("budget.alreadyExists"));
    }

    throw error;
  }
};
