import { FastifyReply, FastifyRequest } from "fastify";
import {
  Account,
  AccountCurrency,
  AccountStatus,
  AccountType,
} from "../entities/account.entity";
import {
  createAccountSchema,
  idParamSchema,
  getAccountsSchema,
  updateAccountSchema,
} from "../schemas/account.schema";
import { validateAndThrowError } from "../utils/validation";
import { getAppDataSource } from "../data-source";
import { AppError } from "../utils/app-error";
import { Transaction, TransactionType } from "../entities/transaction.entity";
import { success } from "../utils/response";
import { checkNotNullUserId } from "../utils/common";

interface CreateAccountBody {
  name: string;
  type: AccountType;
  currency?: AccountCurrency;
  openingBalance: number;
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
  const userId = checkNotNullUserId(request);

  const result = await datasource.transaction(async (manager) => {
    const account = manager.create(Account, {
      userId: userId,
      name: body.name,
      type: body.type,
      currency: AccountCurrency.THB, // ตอนนี้ใช้ได้แค่ THB
    });

    const savedAccount = await manager.save(account);

    const openingBalance = manager.create(Transaction, {
      userId: userId,
      accountId: savedAccount.id,
      categoryId: null,
      type: TransactionType.OPENING_BALANCE,
      amount: String(body.openingBalance),
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
  const userId = checkNotNullUserId(request);

  // รอ Promise หลายตัวพร้อมกัน
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

interface UpdateAccountBody {
  name?: string;
  type?: AccountType;
  accountStatus?: AccountStatus;
}
interface AccountParams {
  id: string;
}

export const updateAccount = async (
  request: FastifyRequest<{ Params: AccountParams; Body: UpdateAccountBody }>,
  reply: FastifyReply,
) => {
  // 1. Validate params and body
  const params = validateAndThrowError<AccountParams>(
    idParamSchema,
    request.params,
    request.t,
  );
  const body = validateAndThrowError<UpdateAccountBody>(
    updateAccountSchema,
    request.body,
    request.t,
  );
  const userId = checkNotNullUserId(request);

  // 2. Update account
  const datasource = getAppDataSource();
  const account = await datasource.manager.findOneBy(Account, {
    id: params.id,
    userId,
  });
  if (!account) {
    throw new AppError(404, request.t("account.notFound"));
  }

  // copy จากซ้ายไปขวา และตัวหลังทับตัวก่อนถ้า key ซ้ำ
  Object.assign(account, body);
  const updatedAccount = await datasource.manager.save(account);

  return reply.code(200).send(
    success(request.t("account.update.success"), {
      id: updatedAccount.id,
      name: updatedAccount.name,
      type: updatedAccount.type,
      currency: updatedAccount.currency,
      accountStatus: updatedAccount.accountStatus,
    }),
  );
};

export const deleteAccount = async (
  request: FastifyRequest<{ Params: AccountParams }>,
  reply: FastifyReply,
) => {
  // Validate param
  const params = validateAndThrowError<AccountParams>(
    idParamSchema,
    request.params,
    request.t,
  );

  // Check user
  const userId = checkNotNullUserId(request);

  // Find the active account
  const datasource = getAppDataSource();
  const account = await datasource.manager.findOneBy(Account, {
    id: params.id,
    userId,
    accountStatus: AccountStatus.ACTIVE,
  });
  if (!account) {
    throw new AppError(404, request.t("account.notFound"));
  }

  // Soft-delete the account by updating
  account.accountStatus = AccountStatus.INACTIVE;
  await datasource.manager.save(account);

  return reply.code(200).send(success(request.t("account.delete.success")));
};
