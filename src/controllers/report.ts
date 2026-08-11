import { FastifyReply, FastifyRequest } from "fastify";
import { checkNotNullUserId } from "../utils/common";
import { getAppDataSource } from "../data-source";
import { Transaction, TransactionType } from "../entities/transaction.entity";
import { success } from "../utils/response";
import { getBangkokDateParts, getBangkokMonthRange } from "../utils/date";
import { Account } from "../entities/account.entity";
import { AppError } from "../utils/app-error";
import { Budget } from "../entities/budget.entity";

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
  const query = request.query;
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

interface ReportCategories {
  page?: number;
  limit?: number;
  type?: TransactionType;
  month?: number;
  year?: number;
  startDate?: Date;
  endDate?: Date;
  accountId?: string;
}
export const getReportCategories = async (
  request: FastifyRequest<{ Querystring: ReportCategories }>,
  reply: FastifyReply,
) => {
  const query = request.query;
  const userId = checkNotNullUserId(request);
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const offset = (page - 1) * limit;
  const datasource = getAppDataSource();
  const transactionRepo = datasource.getRepository(Transaction);
  const transactionQuery = transactionRepo
    .createQueryBuilder("transaction")
    .innerJoin("transaction.account", "account")
    .leftJoin("transaction.category", "category")
    .where("transaction.user_id = :userId", { userId });

  // filter accountId
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

  // filter type
  if (query.type) {
    transactionQuery.andWhere("transaction.type = :type", {
      type: query.type,
    });
  }

  // filter date
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

  const totalQuery = transactionQuery.clone().select(
    `
      COUNT(
        DISTINCT (
          category.id,
          account.currency,
          transaction.type
        )
      )
    `,
    "total",
  );

  const itemsQuery = transactionQuery
    .select([
      `category.id as "categoryId"`,
      `coalesce(category.name, 'Uncategorized') as "categoryName"`,
      `transaction.type as "type"`,
      `account.currency as "currency"`,
      `SUM(transaction.amount) as "totalAmount"`,
      `COUNT(*) as "transactionCount"`,
      `ROUND(
	  SUM(transaction.amount) * 100.0
	  / nullif(
	      SUM(SUM(transaction.amount)) over (
	        partition by account.currency
	      ),
	      0
	    ),
	  2
) as "percentage"`,
    ])
    .groupBy("category.id")
    .addGroupBy("account.currency")
    .addGroupBy("transaction.type")
    .orderBy("SUM(transaction.amount)", "DESC")
    // เหมาะกับ aggregate raw query ที่มี GROUP BY, window function และ getRawMany()
    .offset(offset)
    .limit(limit);

  const [rawItems, totalResult] = await Promise.all([
    itemsQuery.getRawMany(),
    totalQuery.getRawOne<{ total: string }>(),
  ]);

  const total = Number(totalResult?.total ?? 0);

  const items = rawItems.map((item) => ({
    category: {
      id: item.categoryId,
      name: item.categoryName,
    },
    type: item.type,
    currency: item.currency,
    totalAmount: Number(item.totalAmount),
    transactionCount: Number(item.transactionCount),
    percentage: Number(item.percentage),
  }));

  return reply.code(200).send(
    success(request.t("report.categories.success"), {
      period,
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

export const getReportDailyAllowance = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const datasource = getAppDataSource();
  const userId = checkNotNullUserId(request);
  const now = new Date();
  const { year, month, day } = getBangkokDateParts(now);
  const { startDate: startOfMonth } = getBangkokMonthRange(year, month);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const daysRemaining = daysInMonth - day + 1;
  const period = {
    month,
    year,
    startOfMonth,
    now,
    daysRemaining,
  };
  const transactionRepo = datasource.getRepository(Transaction);
  const rawItems = await transactionRepo
    .createQueryBuilder("transaction")
    .innerJoin("transaction.account", "account")
    .select([
      `account.currency as "currency"`,
      `SUM(case when transaction."type" = 'INCOME' then transaction.amount else 0 end) as "totalIncome"`,
      `SUM(case when transaction."type" = 'EXPENSE' then transaction.amount else 0 end) as "totalExpense"`,
      `SUM(case when transaction."type" = 'INCOME' then transaction.amount else 0 end) - SUM(case when transaction."type" = 'EXPENSE' then transaction.amount else 0 end) as "remainingAmount"`,
      `ROUND(
        greatest(
            SUM(case when transaction.type = 'INCOME' then transaction.amount else 0 end) -
            SUM(case when transaction.type = 'EXPENSE' then transaction.amount else 0 end),
            0
        ) / :daysRemaining,
        2
    ) as "dailyAllowance"`,
    ])
    .where("transaction.user_id = :userId", { userId })
    .andWhere("transaction.type IN (:...transactionTypes)", {
      transactionTypes: [TransactionType.INCOME, TransactionType.EXPENSE],
    })
    .andWhere("transaction.transaction_date >= :startOfMonth", { startOfMonth })
    .andWhere("transaction.transaction_date <= :now", { now })
    .groupBy("account.currency")
    .setParameters({
      daysRemaining: daysRemaining,
    })
    .getRawMany();
  /** 
<= now เหมาะกับช่วง “จนถึงเวลาปัจจุบัน”
< endDate เหมาะกับขอบเขตสิ้นเดือน โดย endDate คือเวลา 00:00 ของเดือนถัดไป
*/

  const items = rawItems.map((item) => ({
    currency: item.currency,
    totalIncome: Number(item.totalIncome),
    totalExpense: Number(item.totalExpense),
    remainingAmount: Number(item.remainingAmount),
    dailyAllowance: Number(item.dailyAllowance),
  }));

  return reply.code(200).send(
    success(request.t("report.dailyAllowance.success"), {
      period: {
        month: period.month,
        year: period.year,
        daysRemaining: period.daysRemaining,
      },
      items,
    }),
  );
};

export const getReportDailyBudget = async (
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  const datasource = getAppDataSource();
  const userId = checkNotNullUserId(request);
  const now = new Date();
  const { year, month, day } = getBangkokDateParts(now);
  const { startDate: startOfMonth } = getBangkokMonthRange(year, month);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const daysRemaining = daysInMonth - day + 1;
  const period = {
    month,
    year,
    daysRemaining,
  };
  const budgetRepo = datasource.getRepository(Budget);
  const transactionRepo = datasource.getRepository(Transaction);
  const budgetItems = await budgetRepo
    .createQueryBuilder("b")
    .select([`b.currency AS "currency"`, `SUM(b.amount) AS "totalBudget"`])
    .where("b.user_id = :userId", { userId })
    .andWhere("b.month = :month", { month })
    .andWhere("b.year = :year", { year })
    .groupBy("b.currency")
    .getRawMany();

  const spentItems = await transactionRepo
    .createQueryBuilder("t")
    .innerJoin(
      Budget,
      "b",
      `
      b.user_id = t.user_id
      AND b.category_id = t.category_id
      AND b.month = :month
      AND b.year = :year
    `,
      { month, year },
    )
    .innerJoin("t.account", "a", "a.currency::text = b.currency::text")
    .select([`b.currency AS "currency"`, `SUM(t.amount) AS "budgetSpent"`])
    .where("t.user_id = :userId", { userId })
    .andWhere("t.type = :expenseType", {
      expenseType: TransactionType.EXPENSE,
    })
    .andWhere("t.transaction_date >= :startOfMonth", {
      startOfMonth,
    })
    .andWhere("t.transaction_date <= :now", { now })
    .groupBy("b.currency")
    .getRawMany();

  const items = budgetItems.map((budget) => {
    const spent = spentItems.find((item) => item.currency === budget.currency);

    const totalBudget = Number(budget.totalBudget);
    const budgetSpent = Number(spent?.budgetSpent ?? 0);
    const budgetRemaining = totalBudget - budgetSpent;

    return {
      currency: budget.currency,
      totalBudget,
      budgetSpent,
      budgetRemaining,
      budgetRemainingPerDay: Number(
        (Math.max(budgetRemaining, 0) / daysRemaining).toFixed(2),
      ),
      overspentAmount: Math.max(budgetSpent - totalBudget, 0),
    };
  });

  return reply.code(200).send(
    success(request.t("report.dailyBudget.success"), {
      period: {
        month: period.month,
        year: period.year,
        daysRemaining: period.daysRemaining,
      },
      items,
    }),
  );
};
