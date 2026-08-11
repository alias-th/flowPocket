import { FastifyInstance } from "fastify";
import * as sessionController from "../controllers/session";
import { getSessionsSchema } from "../schemas/session.schema";

const sessionRoutes = async function (fastify: FastifyInstance) {
  fastify.route({
    method: "GET",
    url: "/",
    schema: {
      querystring: getSessionsSchema,
    },
    preHandler: fastify.authentication,
    handler: sessionController.getSessions,
  });
};

export default sessionRoutes;
