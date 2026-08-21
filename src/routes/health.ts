import { FastifyInstance } from "fastify";

const healthRoutes = async function (fastify: FastifyInstance) {
  fastify.get("/health", async (_request, reply) => {
    try {
      await fastify.db.query("SELECT 1");

      return reply.code(200).send({
        status: "ok",
        checks: {
          application: "up",
          database: "up",
        },
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      fastify.log.error({ err: error }, "Health check failed");

      return reply.code(503).send({
        status: "unavailable",
        checks: {
          application: "up",
          database: "down",
        },
        timestamp: new Date().toISOString(),
      });
    }
  });
};

export default healthRoutes;
