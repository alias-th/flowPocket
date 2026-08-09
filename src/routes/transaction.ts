import { FastifyInstance } from "fastify";
import * as transactionController from "../controllers/transaction";

const transactionRoutes = async function (fastify: FastifyInstance) {
  fastify.route({
    method: "POST",
    url: "/",
    preHandler: fastify.authentication,
    handler: transactionController.createTransaction,
  });

  fastify.route({
    method: "POST",
    url: "/:id/images",
    preHandler: fastify.authentication,
    handler: transactionController.uploadImages,
  });

  fastify.route({
    method: "GET",
    url: "/",
    preHandler: fastify.authentication,
    handler: transactionController.getTransactions,
  });
};

export default transactionRoutes;
