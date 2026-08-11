import { FastifyInstance } from "fastify";
import * as reportController from "../controllers/report";
import {
  getReportCategoriesSchema,
  getReportSummarySchema,
} from "../schemas/report.schema";

const reportRoutes = async function (fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authentication);

  fastify.route({
    method: "GET",
    url: "/summary",
    schema: {
      querystring: getReportSummarySchema,
    },
    handler: reportController.getReportSummary,
  });

  fastify.route({
    method: "GET",
    url: "/categories",
    schema: {
      querystring: getReportCategoriesSchema,
    },
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
