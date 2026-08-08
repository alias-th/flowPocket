import { FastifyReply, FastifyRequest } from "fastify";
import {
  Account,
  AccountCurrency,
  AccountStatus,
  AccountType,
} from "../entities/account.entity";
import {
  createAccountSchema,
  getAccountsSchema,
} from "../schemas/account.schema";
import { validateAndThrowError } from "../utils/validation";
import { getAppDataSource } from "../data-source";
import { AppError } from "../utils/app-error";
import { Transaction, TransactionType } from "../entities/transaction.entity";
import { success } from "../utils/response";

interface CreateAccountBody {
  name: string;
  type: AccountType;
  currency?: AccountCurrency;
  openingBalance: string;
}
export const createNewAccount = async (
  request: FastifyRequest<{ Body: CreateAccountBody }>,
  reply: FastifyReply,
) => {
  const body = validateAndThrowError<CreateAccountBody>(
    createAccountSchema,
    request.body,
    request.t,
  );
  const datasource = getAppDataSource();
  const userId = request.userId;
  if (!userId) {
    throw new AppError(401, request.t("auth.unauthorized"));
  }

  const result = await datasource.transaction(async (manager) => {
    const account = manager.create(Account, {
      userId: userId,
      name: body.name,
      type: body.type,
      currency: body.currency ?? AccountCurrency.THB,
    });

    const savedAccount = await manager.save(account);

    const openingBalance = manager.create(Transaction, {
      userId: userId,
      accountId: savedAccount.id,
      categoryId: null,
      type: TransactionType.OPENING_BALANCE,
      amount: body.openingBalance,
      note: "Opening balance",
      transactionDate: new Date(),
    });

    await manager.save(openingBalance);

    return savedAccount;
  });

  return reply.code(201).send(
    success(request.t("account.create.success"), {
      id: result.id,
      name: result.name,
      type: result.type,
      currency: result.currency,
    }),
  );
};
interface GetAccountsQuery {
  page?: number;
  limit?: number;
}
export const getAccounts = async (
  request: FastifyRequest<{ Querystring: GetAccountsQuery }>,
  reply: FastifyReply,
) => {
  const datasource = getAppDataSource();
  const query = validateAndThrowError<GetAccountsQuery>(
    getAccountsSchema,
    request.query,
    request.t,
  );
  const { page, limit } = query;
  const offset = (page! - 1) * limit!;
  const userId = request.userId;
  if (!userId) {
    throw new AppError(401, request.t("auth.unauthorized"));
  }

  const [items, total] = await Promise.all([
    datasource
      .getRepository(Account)
      .createQueryBuilder("account")
      .leftJoin("account.transactions", "transaction")
      .select([
        `account.id AS "id"`,
        `account.name AS "name"`,
        `account.type AS "type"`,
        `account.currency AS "currency"`,
        `COALESCE(
        SUM(
          CASE
            WHEN transaction.type IN (:...creditTypes)
              THEN transaction.amount
            WHEN transaction.type = :expenseType
              THEN -transaction.amount
            ELSE 0
          END
        ),
        0
      ) AS "balance"`,
      ])
      .where("account.user_id = :userId", { userId })
      .andWhere("account.account_status = :status", {
        status: AccountStatus.ACTIVE,
      })
      .groupBy("account.id")
      .orderBy("account.created_at", "DESC")
      .offset(offset)
      .limit(limit)
      .setParameters({
        creditTypes: [TransactionType.INCOME, TransactionType.OPENING_BALANCE],
        expenseType: TransactionType.EXPENSE,
      })
      .getRawMany(),
    datasource.manager.count(Account, {
      where: {
        userId,
        accountStatus: AccountStatus.ACTIVE,
      },
    }),
  ]);

  return reply.code(200).send(
    success(request.t("account.get.success"), {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit!),
      },
    }),
  );
};
