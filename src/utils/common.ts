import { FastifyRequest } from "fastify";
import { AppError } from "./app-error";

export function getUserId(request: FastifyRequest): string {
  if (!request.userId) {
    throw new AppError(401, request.t("auth.unauthorized"));
  }

  return request.userId;
}
