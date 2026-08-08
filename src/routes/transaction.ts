import { FastifyInstance } from "fastify";
import * as transactionController from "../controllers/transaction";

const transactionRoutes = async function (fastify: FastifyInstance) {
  fastify.route({
    method: "POST",
    url: "/",
    preHandler: fastify.authentication,
    handler: transactionController.createTransaction,
  });
};

export default transactionRoutes;
