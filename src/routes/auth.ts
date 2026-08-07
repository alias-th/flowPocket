import { FastifyInstance } from "fastify";
import * as authController from "../controllers/auth";

const authRoutes = async function (fastify: FastifyInstance) {
  fastify.post("/register", authController.register);
};

export default authRoutes;
