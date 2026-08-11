import { FastifyInstance } from "fastify";
import * as categoryController from "../controllers/category";
import {
  categoryIdParamSchema,
  createCategorySchema,
  getCategoriesSchema,
  updateCategorySchema,
} from "../schemas/category.schema";

const categoryRoutes = async function (fastify: FastifyInstance) {
  fastify.addHook("preHandler", fastify.authentication);

  fastify.route({
    method: "POST",
    url: "/",
    schema: {
      body: createCategorySchema,
    },
    handler: categoryController.createCategory,
  });

  fastify.route({
    method: "GET",
    url: "/",
    schema: {
      querystring: getCategoriesSchema,
    },
    handler: categoryController.getCategories,
  });

  fastify.route({
    method: "PATCH",
    url: "/:id",
    schema: {
      params: categoryIdParamSchema,
      body: updateCategorySchema,
    },
    handler: categoryController.updateCategory,
  });

  fastify.route({
    method: "DELETE",
    url: "/:id",
    schema: {
      params: categoryIdParamSchema,
    },
    handler: categoryController.deleteCategory,
  });
};

export default categoryRoutes;
