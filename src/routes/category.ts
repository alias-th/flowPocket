import { FastifyInstance } from "fastify";
import * as categoryController from "../controllers/category";

const categoryRoutes = async function (fastify: FastifyInstance) {
  fastify.route({
    method: "POST",
    url: "/",
    preHandler: fastify.authentication,
    handler: categoryController.createCategory,
  });

  fastify.route({
    method: "GET",
    url: "/",
    preHandler: fastify.authentication,
    handler: categoryController.getCategories,
  });

  fastify.route({
    method: "PATCH",
    url: "/:id",
    preHandler: fastify.authentication,
    handler: categoryController.updateCategory,
  });

  fastify.route({
    method: "DELETE",
    url: "/:id",
    preHandler: fastify.authentication,
    handler: categoryController.deleteCategory,
  });
};

export default categoryRoutes;
