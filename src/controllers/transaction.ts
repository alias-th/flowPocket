import { FastifyReply, FastifyRequest } from "fastify";
import { validateAndThrowError } from "../utils/validation";
import {
  createTransactionSchema,
  getTransactionsSchema,
} from "../schemas/transaction.schema";
import { getAppDataSource } from "../data-source";
import { Transaction, TransactionType } from "../entities/transaction.entity";
import { checkNotNullUserId } from "../utils/common";
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
  const userId = checkNotNullUserId(request);
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

interface GetTransactionQuery {
  page?: number;
  limit?: number;
  type?: TransactionType;
  accountId?: string;
  month?: number;
  year?: number;
  startDate?: Date;
  endDate?: Date;
}

export const getTransactions = async (
  request: FastifyRequest<{ Querystring: GetTransactionQuery }>,
  reply: FastifyReply,
) => {
  const query = validateAndThrowError<GetTransactionQuery>(
    getTransactionsSchema,
    request.query,
    request.t,
  );

  const userId = checkNotNullUserId(request);
  const datasource = getAppDataSource();

  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;

  // Join column and filter userId
  const transactionQuery = datasource
    .getRepository(Transaction)
    .createQueryBuilder("transaction")
    .innerJoinAndSelect("transaction.account", "account")
    .leftJoinAndSelect("transaction.category", "category") // filter null category
    .where("transaction.user_id = :userId", { userId });

  if (query.type) {
    transactionQuery.andWhere("transaction.type = :type", {
      type: query.type,
    });
  }

  if (query.accountId) {
    transactionQuery.andWhere("transaction.account_id = :accountId", {
      accountId: query.accountId,
    });
  }

  // filter month and year
  if (query.month !== undefined && query.year !== undefined) {
    // -1 ตาม index javascript, วันที่ 1
    const startOfMonth = new Date(Date.UTC(query.year, query.month - 1, 1));

    const startOfNextMonth = new Date(Date.UTC(query.year, query.month, 1));

    transactionQuery
      .andWhere("transaction.transaction_date >= :startOfMonth", {
        startOfMonth,
      })
      .andWhere("transaction.transaction_date < :startOfNextMonth", {
        startOfNextMonth,
      });
  } else {
    // filter startDate or endDate
    if (query.startDate) {
      transactionQuery.andWhere("transaction.transaction_date >= :startDate", {
        startDate: query.startDate,
      });
    }

    if (query.endDate) {
      transactionQuery.andWhere("transaction.transaction_date <= :endDate", {
        endDate: query.endDate,
      });
    }
  }

  const [transactions, total] = await transactionQuery
    .orderBy("transaction.transaction_date", "DESC")
    .addOrderBy("transaction.created_at", "DESC")
    .skip(offset)
    .take(limit)
    .getManyAndCount();

  return reply.code(200).send(
    success(request.t("transaction.get.success"), {
      items: transactions.map((transaction) => ({
        id: transaction.id,
        account: {
          id: transaction.account.id,
          name: transaction.account.name,
        },
        category: transaction.category
          ? {
              id: transaction.category.id,
              name: transaction.category.name,
            }
          : null,
        type: transaction.type,
        amount: transaction.amount,
        note: transaction.note,
        transactionDate: transaction.transactionDate,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }),
  );
};
