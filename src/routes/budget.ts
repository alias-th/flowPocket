import { FastifyInstance } from "fastify";
import * as budgetController from "../controllers/budget";

const budgetRoutes = async function (fastify: FastifyInstance) {
  fastify.route({
    method: "POST",
    url: "/",
    preHandler: fastify.authentication,
    handler: budgetController.createBudget,
  });
};

export default budgetRoutes;
