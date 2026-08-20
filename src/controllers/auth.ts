import { FastifyReply, FastifyRequest } from "fastify";
import { success } from "../utils/response";
import { PreferredLanguage, User } from "../entities/user.entity";
import { AppError } from "../utils/app-error";
import bcrypt from "bcrypt";
import { UAParser } from "ua-parser-js";
import { Session } from "../entities/session.entity";
import { generateSessionToken, hashToken } from "../utils/token";
import { IsNull, MoreThan } from "typeorm";

interface RegisterBody {
  name: string;
  email: string;
  password: string;
  preferredLanguage?: PreferredLanguage;
}
export const register = async (
  request: FastifyRequest<{ Body: RegisterBody }>,
  reply: FastifyReply,
) => {
  const { email, name, password, preferredLanguage } = request.body;
  const datasource = request.server.db;

  // 1. Normalize email
  const existingAccount = await datasource.manager.findOneBy(User, {
    email,
  });
  if (existingAccount) {
    throw new AppError(409, request.t("auth.emailAlreadyInUse"));
  }

  // 2. Hash password
  // bcrypt สะดวกกว่าและลดความเสี่ยงจากการใช้อัลกอริทึมหรือจัดการ salt ผิด
  // ทำงานช้า เพื่อต้านการเดารหัสผ่าน
  const hashedPassword = await bcrypt.hash(password, 12);

  // 3. Create new user
  const newUser = new User();
  newUser.name = name;
  newUser.email = email;
  newUser.passwordHash = hashedPassword;
  if (preferredLanguage) {
    newUser.preferredLanguage = preferredLanguage;
  }
  const user = await datasource.manager.save(newUser);

  // 4. Response
  return reply.code(201).send(
    success(request.t("auth.register.success"), {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    }),
  );
};

interface LoginBody {
  email: string;
  password: string;
}
export const login = async (
  request: FastifyRequest<{ Body: LoginBody }>,
  reply: FastifyReply,
) => {
  const { email, password } = request.body;
  const datasource = request.server.db;
  const { device, ua } = UAParser(request.headers["user-agent"]);
  const userIp = request.ip;

  // 1. Normalize email
  const existingAccount = await datasource.manager.findOneBy(User, {
    email,
  });
  if (!existingAccount) {
    throw new AppError(401, request.t("auth.login.invalidCredentials"));
  }

  // 2. Compare password
  const passwordIsValid = await bcrypt.compare(
    password,
    existingAccount.passwordHash,
  );
  if (!passwordIsValid) {
    throw new AppError(401, request.t("auth.login.invalidCredentials"));
  }

  // 3. Get session metadata from ua
  const userAgent = {
    deviceName: device.toString(),
    userAgent: ua,
    ipAddress: userIp,
  };

  // 4. Generate random secure session token
  const { hashedToken: accessTokenHashed, rawToken: accessRawToken } =
    generateSessionToken(request.server.config.SESSION_TOKEN_SECRET);
  const { hashedToken: refreshTokenHashed, rawToken: refreshRawToken } =
    generateSessionToken(request.server.config.SESSION_TOKEN_SECRET);

  // 5. Create session
  const accessTokenTtlSecondes = Number(
    request.server.config.ACCESS_TOKEN_TTL_SECONDS,
  );
  const refreshTokenTtlSeconds = Number(
    request.server.config.REFRESH_TOKEN_TTL_SECONDS,
  );
  const accessTokenExpiresAt = new Date(
    Date.now() + accessTokenTtlSecondes * 1000,
  );
  const refreshTokenExpiresAt = new Date(
    Date.now() + refreshTokenTtlSeconds * 1000,
  );

  const newSession = new Session();
  newSession.userId = existingAccount.id;
  newSession.deviceName = userAgent.deviceName;
  newSession.ipAddress = userAgent.ipAddress;
  newSession.userAgent = userAgent.userAgent;

  // new field
  newSession.accessTokenHash = accessTokenHashed;
  newSession.refreshTokenHash = refreshTokenHashed;
  newSession.accessTokenExpiresAt = accessTokenExpiresAt;
  newSession.refreshTokenExpiresAt = refreshTokenExpiresAt;

  await datasource.manager.save(newSession);
  return reply.code(200).send(
    success(request.t("auth.login.success"), {
      user: {
        id: existingAccount.id,
        email: existingAccount.email,
        name: existingAccount.name,
      },
      accessToken: accessRawToken,
      refreshToken: refreshRawToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    }),
  );
};

interface RefreshTokenBody {
  refreshToken: string;
}
export const refreshToken = async (
  request: FastifyRequest<{ Body: RefreshTokenBody }>,
  reply: FastifyReply,
) => {
  const refreshTokenRaw = request.body.refreshToken;
  const datasource = request.server.db;
  const sessionRepo = datasource.getRepository(Session);

  // hash refresh token
  const secretMessage = request.server.config.SESSION_TOKEN_SECRET;
  const refreshTokenHash = hashToken(refreshTokenRaw, secretMessage);

  // generate new access_token, refresh_token
  const { hashedToken: accessTokenHashed, rawToken: accessRawToken } =
    generateSessionToken(request.server.config.SESSION_TOKEN_SECRET);
  const { hashedToken: refreshTokenHashed, rawToken: refreshRawToken } =
    generateSessionToken(request.server.config.SESSION_TOKEN_SECRET);

  const accessTokenTtlSecondes = Number(
    request.server.config.ACCESS_TOKEN_TTL_SECONDS,
  );
  const refreshTokenTtlSeconds = Number(
    request.server.config.REFRESH_TOKEN_TTL_SECONDS,
  );
  const accessTokenExpiresAt = new Date(
    Date.now() + accessTokenTtlSecondes * 1000,
  );
  const refreshTokenExpiresAt = new Date(
    Date.now() + refreshTokenTtlSeconds * 1000,
  );

  // update
  const result = await sessionRepo.update(
    {
      refreshTokenHash,
      refreshTokenRevokedAt: IsNull(),
      refreshTokenExpiresAt: MoreThan(new Date()),
    },
    {
      accessTokenHash: accessTokenHashed,
      accessTokenExpiresAt,
      accessTokenRevokedAt: null,
      refreshTokenHash: refreshTokenHashed,
      refreshTokenExpiresAt,
      refreshTokenRevokedAt: null,
    },
  );

  if (result.affected !== 1) {
    throw new AppError(401, request.t("auth.unauthorized"));
  }

  return reply.code(200).send(
    success(request.t("auth.refresh.success"), {
      accessToken: accessRawToken,
      refreshToken: refreshRawToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    }),
  );
};

export const logout = async (request: FastifyRequest, reply: FastifyReply) => {
  const datasource = request.server.db;
  const sessionId = request.sessionId;
  const userId = request.userId;
  const expiresDate = new Date();
  await datasource.manager.update(
    Session,
    { id: sessionId, userId: userId },
    {
      accessTokenRevokedAt: expiresDate,
      refreshTokenRevokedAt: expiresDate,
    },
  );

  return reply.code(200).send(success(request.t("auth.logout.success")));
};

export const me = async (request: FastifyRequest, reply: FastifyReply) => {
  const datasource = request.server.db;
  const userId = request.userId;
  const user = await datasource.manager.findOne(User, {
    where: {
      id: userId ?? "",
    },
  });
  if (!user) {
    throw new AppError(401, request.t("auth.userNotFound"));
  }

  return reply.code(200).send(
    success(request.t("auth.me.success"), {
      id: user.id,
      email: user.email,
      name: user.name,
      preferredLanguage: user.preferredLanguage,
      createdAt: user.createdAt,
    }),
  );
};
