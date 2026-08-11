import { FastifyReply, FastifyRequest } from "fastify";
import { checkNotNullUserId } from "../utils/common";
import { getAppDataSource } from "../data-source";
import { Category, CategoryType } from "../entities/category.entity";
import { AppError, isBudgetUniqueViolation } from "../utils/app-error";
import { Budget } from "../entities/budget.entity";
import { success } from "../utils/response";
import { TransactionType } from "../entities/transaction.entity";

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
  const body = request.body;
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

interface GetBudgetQuery {
  page?: number;
  limit?: number;
  month?: number;
  year?: number;
}

export const getBudgets = async (
  request: FastifyRequest<{ Querystring: GetBudgetQuery }>,
  reply: FastifyReply,
) => {
  const query = request.query;

  const userId = checkNotNullUserId(request);
  const datasource = getAppDataSource();

  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;
  const now = new Date();
  const month = query.month ?? now.getUTCMonth() + 1;
  const year = query.year ?? now.getUTCFullYear();
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1));

  const budgetRepository = datasource.getRepository(Budget);

  const budgetQuery = budgetRepository
    .createQueryBuilder("budget")
    .innerJoin("budget.category", "category")
    .leftJoin(
      "category.transactions",
      "transaction",
      `
      transaction.user_id = :userId
      AND transaction.type = :transactionType
      AND transaction.transactionDate >= :startDate
      AND transaction.transactionDate < :endDate
    `,
      {
        userId,
        transactionType: TransactionType.EXPENSE,
        startDate,
        endDate,
      },
    )
    .select([
      `budget.id AS "id"`,
      `budget.amount AS "amount"`,
      `budget.month AS "month"`,
      `budget.year AS "year"`,
      `category.id AS "categoryId"`,
      `category.name AS "categoryName"`,
      `COALESCE(SUM(transaction.amount), 0) AS "spentAmount"`,
      `budget.amount - COALESCE(SUM(transaction.amount), 0) AS "remainingAmount"`,
    ])
    .where("budget.userId = :userId", { userId })
    .andWhere("budget.month = :month", { month })
    .andWhere("budget.year = :year", { year })
    .groupBy("budget.id")
    .addGroupBy("category.id")
    .orderBy("category.name", "ASC")
    .offset(offset)
    .limit(limit);

  const [rawItems, total] = await Promise.all([
    budgetQuery.getRawMany(),
    budgetRepository.count({
      where: {
        userId,
        month,
        year,
      },
    }),
  ]);

  const items = rawItems.map((item) => ({
    id: item.id,
    category: {
      id: item.categoryId,
      name: item.categoryName,
    },
    amount: Number(item.amount),
    spentAmount: Number(item.spentAmount),
    remainingAmount: Number(item.remainingAmount),
    month: item.month,
    year: item.year,
  }));

  return reply.code(200).send(
    success(request.t("budget.get.success"), {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }),
  );
};
