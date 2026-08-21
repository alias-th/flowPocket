import { FastifyReply, FastifyRequest } from "fastify";
import { Session } from "../entities/session.entity";
import { checkNotNullUserId } from "../utils/common";
import { success } from "../utils/response";
import { AppError } from "../utils/app-error";
import { IsNull } from "typeorm";

interface GetSessionsQuery {
  page?: number;
  limit?: number;
  includeRevoked?: boolean;
}

export const getSessions = async (
  request: FastifyRequest<{ Querystring: GetSessionsQuery }>,
  reply: FastifyReply,
) => {
  const query = request.query;
  const userId = checkNotNullUserId(request);
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const includeRevoked = query.includeRevoked ?? false;
  const offset = (page - 1) * limit;
  const datasource = request.server.db;
  const sessionRepo = datasource.getRepository(Session);
  const sessionQuery = sessionRepo
    .createQueryBuilder("session")
    .where("session.userId = :userId", { userId })
    .andWhere("session.expiresAt > :now", {
      now: new Date(),
    });
  if (!includeRevoked) {
    sessionQuery.andWhere("session.revokedAt IS NULL");
  }
  const [sessions, total] = await sessionQuery
    .orderBy("session.createdAt", "DESC")
    .offset(offset)
    .limit(limit)
    .getManyAndCount();

  return reply.code(200).send(
    success(request.t("session.get.success"), {
      items: sessions.map((item) => {
        return {
          id: item.id,
          deviceName: item.deviceName,
          ipAddress: item.ipAddress,
          createdAt: item.createdAt,
          accessTokenExpiresAt: item.accessTokenExpiresAt,
          accessTokenRevokedAt: item.accessTokenRevokedAt,
          refreshTokenExpiresAt: item.refreshTokenExpiresAt,
          refreshTokenRevokedAt: item.refreshTokenRevokedAt,
          isCurrent: item.id === request.sessionId,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }),
  );
};

interface SessionParams {
  sessionId: string;
}
export const deleteSessionById = async (
  req: FastifyRequest<{ Params: SessionParams }>,
  reply: FastifyReply,
) => {
  const { sessionId } = req.params;
  const userId = checkNotNullUserId(req);
  const datasource = req.server.db;
  const sessionRepo = datasource.getRepository(Session);
  const session = await sessionRepo.findOneBy({
    id: sessionId,
    userId,
    accessTokenRevokedAt: IsNull(),
  });
  if (!session) {
    throw new AppError(404, req.t("session.notFound"));
  }
  session.accessTokenRevokedAt = new Date();
  await sessionRepo.save(session);

  return reply.code(200).send(success(req.t("session.delete.success")));
};
