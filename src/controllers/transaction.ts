import { FastifyReply, FastifyRequest } from "fastify";
import { validateAndThrowError } from "../utils/validation";
import { createTransactionSchema } from "../schemas/transaction.schema";
import { getAppDataSource } from "../data-source";
import { Transaction, TransactionType } from "../entities/transaction.entity";
import { getUserId } from "../utils/common";
import { Account, AccountStatus } from "../entities/account.entity";
import { AppError } from "../utils/app-error";
import { Category, CategoryType } from "../entities/category.entity";
import { success } from "../utils/response";

type UserTransactionType = TransactionType.INCOME | TransactionType.EXPENSE;

interface CreateTransactionBody {
  accountId: string;
  categoryId?: string;
  type: UserTransactionType;
  amount: number;
  note?: string;
  transactionDate: Date;
}
const categoryTypeForTransaction = {
  [TransactionType.INCOME]: CategoryType.INCOME,
  [TransactionType.EXPENSE]: CategoryType.EXPENSE,
};

export const createTransaction = async (
  request: FastifyRequest<{ Body: CreateTransactionBody }>,
  reply: FastifyReply,
) => {
  // Validate request body
  const body = validateAndThrowError<CreateTransactionBody>(
    createTransactionSchema,
    request.body,
    request.t,
  );
  const {
    accountId,
    amount,
    transactionDate,
    type: transactionType,
    categoryId,
    note,
  } = body;
  const userId = getUserId(request);
  const datasource = getAppDataSource();

  // Find an active account
  const account = await datasource.manager.findOneBy(Account, {
    id: accountId,
    userId,
    accountStatus: AccountStatus.ACTIVE,
  });
  if (!account) {
    throw new AppError(404, request.t("account.notFound"));
  }

  // Find an active category
  let category: Category | null = null;
  if (categoryId) {
    category = await datasource.manager.findOneBy(Category, {
      id: categoryId,
      categoryStatus: true,
      userId,
    });
    if (!category) {
      throw new AppError(404, request.t("category.notFound"));
    }

    // Check type
    if (category.type !== categoryTypeForTransaction[transactionType]) {
      throw new AppError(400, request.t("transaction.categoryTypeMismatch"));
    }
  }

  // Create Transaction
  const transactionInstance = datasource.manager.create(Transaction, {
    userId,
    note: note ?? null,
    amount: String(amount),
    categoryId: category?.id ?? null,
    accountId: account.id,
    transactionDate: transactionDate,
    type: transactionType,
  });

  const transaction = await datasource.manager.save(transactionInstance);

  // Response
  return reply.code(201).send(
    success(request.t("transaction.create.success"), {
      id: transaction.id,
      userId: transaction.userId,
      accountId: transaction.accountId,
      categoryId: transaction.categoryId,
      type: transaction.type,
      amount: transaction.amount,
      note: transaction.note,
      transactionDate: transaction.transactionDate,
    }),
  );
};
