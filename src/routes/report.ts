import { FastifyInstance } from "fastify";
import * as reportController from "../controllers/report";

const reportRoutes = async function (fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authentication);

  fastify.route({
    method: "GET",
    url: "/summary",
    handler: reportController.getReportSummary,
  });

  fastify.route({
    method: "GET",
    url: "/categories",
    handler: reportController.getReportCategories,
  });

  fastify.route({
    method: "GET",
    url: "/daily-allowance",
    handler: reportController.getReportDailyAllowance,
  });

  fastify.route({
    method: "GET",
    url: "/daily-budget",
    handler: reportController.getReportDailyBudget,
  });
};

export default reportRoutes;
