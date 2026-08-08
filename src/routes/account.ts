import { FastifyInstance } from "fastify";
import * as accountController from "../controllers/account";

const accountRoutes = async function (fastify: FastifyInstance) {
  fastify.route({
    method: "POST",
    url: "/",
    preHandler: fastify.authentication,
    handler: accountController.createNewAccount,
  });
  fastify.route({
    method: "GET",
    url: "/",
    preHandler: fastify.authentication,
    handler: accountController.getAccounts,
  });
  fastify.route({
    method: "PATCH",
    url: "/:id",
    preHandler: fastify.authentication,
    handler: accountController.updateAccount,
  });
  fastify.route({
    method: "DELETE",
    url: "/:id",
    preHandler: fastify.authentication,
    handler: accountController.deleteAccount,
  });
};

export default accountRoutes;
