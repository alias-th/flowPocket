import { FastifyReply, FastifyRequest } from "fastify";
import { validateAndThrowError } from "../utils/validation";
import { getSessionsSchema } from "../schemas/session.schema";
import { getAppDataSource } from "../data-source";
import { Session } from "../entities/session.entity";
import { checkNotNullUserId } from "../utils/common";
import { success } from "../utils/response";

interface GetSessionsQuery {
  page?: number;
  limit?: number;
  includeRevoked?: boolean;
}

export const getSessions = async (
  request: FastifyRequest<{ Querystring: GetSessionsQuery }>,
  reply: FastifyReply,
) => {
  const query = validateAndThrowError<GetSessionsQuery>(
    getSessionsSchema,
    request.query,
    request.t,
  );
  const userId = checkNotNullUserId(request);
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const includeRevoked = query.includeRevoked ?? false;
  const offset = (page - 1) * limit;
  const datasource = getAppDataSource();
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
          expiresAt: item.expiresAt,
          revokedAt: item.revokedAt,
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
