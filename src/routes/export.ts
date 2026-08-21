import { FastifyInstance } from "fastify";

const exportRoutes = async function (fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authentication);
};

export default exportRoutes;
