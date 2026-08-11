import { FastifyInstance } from "fastify";
import * as budgetController from "../controllers/budget";
import { createBudgetSchema, getBudgetsSchema } from "../schemas/budget.schema";

const budgetRoutes = async function (fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authentication);

  fastify.route({
    method: "POST",
    url: "/",
    schema: {
      body: createBudgetSchema,
    },
    handler: budgetController.createBudget,
  });

  fastify.route({
    method: "GET",
    url: "/",
    schema: {
      querystring: getBudgetsSchema,
    },
    handler: budgetController.getBudgets,
  });
};

export default budgetRoutes;
