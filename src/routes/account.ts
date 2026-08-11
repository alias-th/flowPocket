import { FastifyInstance } from "fastify";
import * as accountController from "../controllers/account";
import {
  createAccountSchema,
  getAccountsSchema,
  idParamSchema,
  updateAccountSchema,
} from "../schemas/account.schema";

const accountRoutes = async function (fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authentication);

  fastify.route({
    method: "POST",
    url: "/",
    schema: {
      body: createAccountSchema,
    },
    handler: accountController.createNewAccount,
  });
  fastify.route({
    method: "GET",
    url: "/",
    schema: {
      querystring: getAccountsSchema,
    },
    handler: accountController.getAccounts,
  });
  fastify.route({
    method: "PATCH",
    url: "/:id",
    schema: {
      params: idParamSchema,
      body: updateAccountSchema,
    },
    handler: accountController.updateAccount,
  });
  fastify.route({
    method: "DELETE",
    url: "/:id",
    schema: {
      params: idParamSchema,
    },
    handler: accountController.deleteAccount,
  });
};

export default accountRoutes;
