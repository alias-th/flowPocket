import { FastifyInstance } from "fastify";
import * as budgetController from "../controllers/budget";

const budgetRoutes = async function (fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authentication);

  fastify.route({
    method: "POST",
    url: "/",
    handler: budgetController.createBudget,
  });

  fastify.route({
    method: "GET",
    url: "/",
    handler: budgetController.getBudgets,
  });
};

export default budgetRoutes;
