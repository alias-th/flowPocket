import { FastifyInstance } from "fastify";
import * as transactionController from "../controllers/transaction";
import {
  createTransactionSchema,
  getTransactionsSchema,
  transactionIdParamSchema,
  updateTransactionSchema,
  uploadImagesParamsSchema,
} from "../schemas/transaction.schema";

const transactionRoutes = async function (fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authentication);

  fastify.route({
    method: "PATCH",
    url: "/:id",
    schema: {
      params: transactionIdParamSchema,
      body: updateTransactionSchema,
    },
    handler: transactionController.updateTransaction,
  });

  fastify.route({
    method: "POST",
    url: "/",
    schema: {
      body: createTransactionSchema,
    },
    handler: transactionController.createTransaction,
  });

  fastify.route({
    method: "POST",
    url: "/:id/images",
    schema: {
      params: uploadImagesParamsSchema,
    },
    handler: transactionController.uploadImages,
  });

  fastify.route({
    method: "GET",
    url: "/",
    schema: {
      querystring: getTransactionsSchema,
    },
    handler: transactionController.getTransactions,
  });
};

export default transactionRoutes;
