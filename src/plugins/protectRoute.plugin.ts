import { FastifyPluginCallback, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { hashToken } from "../utils/token";
import { Session } from "../entities/session.entity";
import { getAppDataSource } from "../data-source";
import { IsNull, MoreThan } from "typeorm";
import { AppError } from "../utils/app-error";

const protectRoutePlugin: FastifyPluginCallback = fp(
  function (fastify, _opts, done) {
    fastify.decorate(
      "authentication",
      async function (request: FastifyRequest, _reply: FastifyReply) {
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
        const datasource = getAppDataSource();
        const session = await datasource.manager.findOneBy(Session, {
          tokenHash: hashedToken,
          revokedAt: IsNull(),
          expiresAt: MoreThan(new Date()),
        });

        if (!session) {
          throw new AppError(401, request.t("auth.unauthorized"));
        }

        request.userId = session.userId;
      },
    );

    done();
  },
);

export default protectRoutePlugin;
