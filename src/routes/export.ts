import { FastifyInstance } from "fastify";
import * as exportController from "../controllers/export";
import { getExportSchema } from "../schemas/export.schema";

const exportRoutes = async function (fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authentication);
  fastify.route({
    method: "GET",
    url: "/",
    schema: {
      querystring: getExportSchema,
    },
    handler: exportController.getExport,
  });
};

export default exportRoutes;
