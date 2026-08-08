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
};

export default accountRoutes;
