//  const budgetQuery = budgetRepository
//     .createQueryBuilder("budget")
//     .innerJoin("budget.category", "category")
//     .leftJoin(
//       "category.transactions",
//       "transaction",
//       `
//       transaction.userId = budget.userId
//       AND transaction.type = :transactionType
//       AND transaction.transactionDate >= :startDate
//       AND transaction.transactionDate < :endDate
//     `,
//       {
//         transactionType: TransactionType.EXPENSE,
//         startDate,
//         endDate,
//       },
//     )
//     .select([
//       `budget.id AS "id"`,
//       `budget.amount AS "amount"`,
//       `budget.month AS "month"`,
//       `budget.year AS "year"`,
//       `category.id AS "categoryId"`,
//       `category.name AS "categoryName"`,
//       `COALESCE(SUM(transaction.amount), 0) AS "spentAmount"`,
//       `budget.amount - COALESCE(SUM(transaction.amount), 0) AS "remainingAmount"`,
//     ])
//     .where("budget.userId = :userId", { userId })
//     .andWhere("budget.month = :month", { month })
//     .andWhere("budget.year = :year", { year })
//     .groupBy("budget.id")
//     .addGroupBy("category.id")
//     .orderBy("category.name", "ASC")
//     .offset(offset)
//     .limit(limit);

// export const getBudgets = async (
//   request: FastifyRequest<{ Querystring: GetBudgetQuery }>,
//   reply: FastifyReply,
// ) => {
//   const query = validateAndThrowError<GetBudgetQuery>(
//     getBudgetSchema,
//     request.query,
//     request.t,
//   );

//   const userId = checkNotNullUserId(request);
//   const datasource = getAppDataSource();

//   const page = query.page ?? 1;
//   const limit = query.limit ?? 20;
//   const offset = (page - 1) * limit;

//   const budgetRepository = datasource.getRepository(Budget);

//   const budgetQuery = budgetRepository
//     .createQueryBuilder("budget")
//     .where("budget.userId = :userId", { userId });

//   /*
//    * เลือก budget
//    *
//    * 1. month/year: เลือกเดือนเดียว
//    * 2. startDate/endDate: เลือกหลายเดือน
//    * 3. ไม่ส่งอะไร: เลือกเดือนปัจจุบัน
//    */
//   if (query.month !== undefined && query.year !== undefined) {
//     budgetQuery
//       .andWhere("budget.month = :month", {
//         month: query.month,
//       })
//       .andWhere("budget.year = :year", {
//         year: query.year,
//       });
//   } else if (query.startDate || query.endDate) {
//     if (query.startDate) {
//       const startPeriod =
//         query.startDate.getUTCFullYear() * 12 +
//         (query.startDate.getUTCMonth() + 1);

//       budgetQuery.andWhere(
//         "(budget.year * 12 + budget.month) >= :startPeriod",
//         { startPeriod },
//       );
//     }

//     if (query.endDate) {
//       const endPeriod =
//         query.endDate.getUTCFullYear() * 12 + (query.endDate.getUTCMonth() + 1);

//       budgetQuery.andWhere("(budget.year * 12 + budget.month) <= :endPeriod", {
//         endPeriod,
//       });
//     }
//   } else {
//     const now = new Date();
//     const currentMonth = now.getUTCMonth() + 1;
//     const currentYear = now.getUTCFullYear();

//     budgetQuery
//       .andWhere("budget.month = :currentMonth", {
//         currentMonth,
//       })
//       .andWhere("budget.year = :currentYear", {
//         currentYear,
//       });
//   }

//   // Clone ก่อนเพิ่ม GROUP BY และ pagination เพื่อนับจำนวน budget
//   const totalQuery = budgetQuery.clone();

//   budgetQuery
//     .innerJoin("budget.category", "category")
//     .leftJoin(
//       "category.transactions",
//       "transaction",
//       `
//         transaction.userId = budget.userId
//         AND transaction.type = :transactionType
//         AND transaction.transactionDate >= make_timestamptz(
//           budget.year,
//           budget.month,
//           1,
//           0,
//           0,
//           0,
//           'UTC'
//         )
//         AND transaction.transactionDate < make_timestamptz(
//           budget.year,
//           budget.month,
//           1,
//           0,
//           0,
//           0,
//           'UTC'
//         ) + INTERVAL '1 month'
//       `,
//       {
//         transactionType: TransactionType.EXPENSE,
//       },
//     )
//     .select([
//       `budget.id AS "id"`,
//       `budget.amount AS "amount"`,
//       `budget.month AS "month"`,
//       `budget.year AS "year"`,
//       `category.id AS "categoryId"`,
//       `category.name AS "categoryName"`,
//       `COALESCE(SUM(transaction.amount), 0) AS "spentAmount"`,
//       `budget.amount - COALESCE(
//         SUM(transaction.amount),
//         0
//       ) AS "remainingAmount"`,
//     ])
//     .groupBy("budget.id")
//     .addGroupBy("category.id")
//     .orderBy("category.name", "ASC")
//     .offset(offset)
//     .limit(limit);

//   const [rawItems, total] = await Promise.all([
//     budgetQuery.getRawMany(),
//     totalQuery.getCount(),
//   ]);

//   const items = rawItems.map((item) => ({
//     id: item.id,
//     category: {
//       id: item.categoryId,
//       name: item.categoryName,
//     },
//     amount: Number(item.amount),
//     spentAmount: Number(item.spentAmount),
//     remainingAmount: Number(item.remainingAmount),
//     month: item.month,
//     year: item.year,
//   }));

//   return reply.code(200).send(
//     success(request.t("budget.get.success"), {
//       items,
//       pagination: {
//         page,
//         limit,
//         total,
//         totalPages: Math.ceil(total / limit),
//       },
//     }),
//   );
// };
