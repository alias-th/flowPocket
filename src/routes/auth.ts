import { FastifyInstance } from "fastify";
import * as authController from "../controllers/auth";
import { loginSchema, registerSchema } from "../schemas/auth.schema";

const authRoutes = async function (fastify: FastifyInstance) {
  fastify.post(
    "/register",
    {
      schema: {
        body: registerSchema,
      },
    },
    authController.register,
  );
  fastify.post(
    "/login",
    {
      schema: {
        body: loginSchema,
      },
    },
    authController.login,
  );
  fastify.route({
    method: "POST",
    url: "/logout",
    preHandler: fastify.authentication,
    handler: authController.logout,
  });
  fastify.route({
    method: "GET",
    url: "/me",
    preHandler: fastify.authentication,
    handler: authController.me,
  });
};

export default authRoutes;
