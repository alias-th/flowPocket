import { FastifyReply, FastifyRequest } from "fastify";
import { validateAndThrowError } from "../utils/validation";
import { getReportSummarySchema } from "../schemas/report.schema";
import { checkNotNullUserId } from "../utils/common";
import { getAppDataSource } from "../data-source";
import { Transaction, TransactionType } from "../entities/transaction.entity";
import { success } from "../utils/response";
import { getBangkokDateParts, getBangkokMonthRange } from "../utils/date";
import { Account } from "../entities/account.entity";
import { AppError } from "../utils/app-error";

interface ReportSummaryQuery {
  month?: number;
  year?: number;
  startDate?: Date;
  endDate?: Date;
  accountId?: string;
}

export const getReportSummary = async (
  request: FastifyRequest<{ Querystring: ReportSummaryQuery }>,
  reply: FastifyReply,
) => {
  const query = validateAndThrowError<ReportSummaryQuery>(
    getReportSummarySchema,
    request.query,
    request.t,
  );
  const userId = checkNotNullUserId(request);
  const datasource = getAppDataSource();
  const transactionRepo = datasource.getRepository(Transaction);
  const transactionQuery = transactionRepo
    .createQueryBuilder("transaction")
    .innerJoin("transaction.account", "account")
    .where("transaction.user_id = :userId", { userId })
    .andWhere("transaction.type IN (:...transactionTypes)", {
      transactionTypes: [TransactionType.INCOME, TransactionType.EXPENSE],
    });

  if (query.accountId) {
    const account = await datasource.getRepository(Account).findOneBy({
      id: query.accountId,
      userId,
    });

    if (!account) {
      throw new AppError(404, request.t("account.notFound"));
    }
    transactionQuery.andWhere("transaction.account_id = :accountId", {
      accountId: query.accountId,
    });
  }

  let period: Record<string, Date | number | undefined>;

  if (query.month !== undefined && query.year !== undefined) {
    const { startDate, endDate } = getBangkokMonthRange(
      query.year,
      query.month,
    );

    transactionQuery
      .andWhere("transaction.transaction_date >= :startDate", {
        startDate,
      })
      .andWhere("transaction.transaction_date < :endDate", {
        endDate,
      });

    period = { month: query.month, year: query.year };
  } else if (query.startDate || query.endDate) {
    if (query.startDate) {
      transactionQuery.andWhere("transaction.transaction_date >= :startDate", {
        startDate: query.startDate,
      });
    }

    if (query.endDate) {
      transactionQuery.andWhere("transaction.transaction_date < :endDate", {
        endDate: query.endDate,
      });
    }

    period = { startDate: query.startDate, endDate: query.endDate };
  } else {
    const { month, year } = getBangkokDateParts();
    const { startDate, endDate } = getBangkokMonthRange(year, month);

    transactionQuery
      .andWhere("transaction.transaction_date >= :startDate", { startDate })
      .andWhere("transaction.transaction_date < :endDate", { endDate });

    period = { month, year };
  }
  const rawItems = await transactionQuery
    .select([
      `account.id AS "accountId"`,
      `account.name AS "accountName"`,
      `account.currency AS "currency"`,
      `account.accountStatus AS "accountStatus"`,
      `SUM(
      CASE
        WHEN transaction.type = :incomeType
        THEN transaction.amount
        ELSE 0
      END
    ) AS "totalIncome"`,

      `SUM(
      CASE
        WHEN transaction.type = :expenseType
        THEN transaction.amount
        ELSE 0
      END
    ) AS "totalExpense"`,

      `SUM(
      CASE
        WHEN transaction.type = :incomeType
        THEN transaction.amount
        ELSE 0
      END
    ) - SUM(
      CASE
        WHEN transaction.type = :expenseType
        THEN transaction.amount
        ELSE 0
      END
    ) AS "netCashFlow"`,
    ])
    .groupBy("account.id")
    .orderBy("account.name", "ASC")
    .setParameters({
      incomeType: TransactionType.INCOME,
      expenseType: TransactionType.EXPENSE,
    })
    .getRawMany();

  const items = rawItems.map((item) => ({
    account: {
      id: item.accountId,
      name: item.accountName,
      accountStatus: item.accountStatus,
    },
    currency: item.currency,
    totalIncome: Number(item.totalIncome),
    totalExpense: Number(item.totalExpense),
    netCashFlow: Number(item.netCashFlow),
  }));

  return reply.code(200).send(
    success(request.t("report.summary.success"), {
      period: period,
      summary: items,
    }),
  );
};

export const getReportCategories = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {};

export const getReportDailyAllowance = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {};

export const getReportDailyBudget = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {};
