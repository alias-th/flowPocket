import { FastifyInstance } from "fastify";
import * as sessionController from "../controllers/session";
import {
  deleteSessionParamsSchema,
  getSessionsSchema,
} from "../schemas/session.schema";

const sessionRoutes = async function (fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authentication);

  fastify.route({
    method: "GET",
    url: "/",
    schema: {
      querystring: getSessionsSchema,
    },
    handler: sessionController.getSessions,
  });

  fastify.route({
    method: "DELETE",
    url: "/:sessionId",
    schema: {
      params: deleteSessionParamsSchema,
    },
    handler: sessionController.deleteSessionById,
  });
};

export default sessionRoutes;
