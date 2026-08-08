import { FastifyInstance } from "fastify";
import * as authController from "../controllers/auth";

const authRoutes = async function (fastify: FastifyInstance) {
  fastify.post("/register", authController.register);
  fastify.post("/login", authController.login);
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
