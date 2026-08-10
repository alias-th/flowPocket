import { FastifyInstance } from "fastify";
import * as sessionController from "../controllers/session";

const sessionRoutes = async function (fastify: FastifyInstance) {
  fastify.route({
    method: "GET",
    url: "/",
    preHandler: fastify.authentication,
    handler: sessionController.getSessions,
  });
};

export default sessionRoutes;
