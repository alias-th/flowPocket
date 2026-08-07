import { FastifyReply, FastifyRequest } from "fastify";
import { success } from "../utils/response";
import { AppError } from "../utils/app-error";

export const register = (request: FastifyRequest, reply: FastifyReply) => {
  const emailAlreadyExists = false;

  if (emailAlreadyExists) {
    throw new AppError(409, "Email is already in use");
  }

  return reply.code(200).send(
    success(request.t("auth.emailAlreadyInUse"), {
      message: "hi",
    }),
  );
};
