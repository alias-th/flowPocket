import { FastifyPluginCallback, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { hashToken } from "../utils/token";
import { Session } from "../entities/session.entity";
import { IsNull, MoreThan } from "typeorm";
import { AppError } from "../utils/app-error";

const authenticationPlugin: FastifyPluginCallback = fp(
  function (fastify, _opts, done) {
    fastify.decorateRequest("userId", null);
    fastify.decorateRequest("sessionId", null);

    fastify.decorate(
      "authentication",
      async function (request: FastifyRequest) {
        // Get token
        const authorization = request.headers.authorization;
        const match = authorization?.match(/^Bearer\s+(.+)$/i);

        if (!match) {
          throw new AppError(401, request.t("auth.unauthorized"));
        }

        const rawToken = match[1] ?? "";

        // Validate token
        const secretMessage = request.server.config.SESSION_TOKEN_SECRET;
        const hashedToken = hashToken(rawToken, secretMessage);
        const datasource = request.server.db;
        const session = await datasource.manager.findOneBy(Session, {
          accessTokenHash: hashedToken,
          accessTokenRevokedAt: IsNull(),
          accessTokenExpiresAt: MoreThan(new Date()),
        });

        if (!session) {
          throw new AppError(401, request.t("auth.unauthorized"));
        }

        request.userId = session.userId;
        request.sessionId = session.id;
      },
    );

    done();
  },
);

export default authenticationPlugin;
