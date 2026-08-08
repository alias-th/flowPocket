import { FastifyReply, FastifyRequest } from "fastify";
import { success } from "../utils/response";
import { loginSchema, registerSchema } from "../schemas/auth.schema";
import { validateAndThrowError } from "../utils/validation";
import { getAppDataSource } from "../data-source";
import { PreferredLanguage, User } from "../entities/user.entity";
import { AppError } from "../utils/app-error";
import bcrypt from "bcrypt";
import { UAParser } from "ua-parser-js";
import { Session } from "../entities/session.entity";
import { generateSessionToken } from "../utils/token";

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
  const body = validateAndThrowError<RegisterBody>(
    registerSchema,
    request.body,
    request.t,
  );
  const { email, name, password, preferredLanguage } = body;
  const datasource = getAppDataSource();

  // 1. Normalize email
  const existingAccount = await datasource.manager.findOneBy(User, {
    email,
  });
  if (existingAccount) {
    throw new AppError(409, request.t("auth.emailAlreadyInUse"));
  }

  // 2. Hash password
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
  const body = validateAndThrowError<LoginBody>(
    loginSchema,
    request.body,
    request.t,
  );
  const { email, password } = body;
  const datasource = getAppDataSource();
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
  const { hashedToken, rawToken } = generateSessionToken(
    request.server.config.SESSION_TOKEN_SECRET,
  );

  // 5. Create session
  const SESSION_TTL_DAYS = 30;
  const expiresAt = new Date(
    Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  );
  const newSession = new Session();
  newSession.userId = existingAccount.id;
  newSession.tokenHash = hashedToken;
  newSession.deviceName = userAgent.deviceName;
  newSession.ipAddress = userAgent.ipAddress;
  newSession.userAgent = userAgent.userAgent;
  newSession.expiresAt = expiresAt;

  await datasource.manager.save(newSession);
  return reply.code(200).send(
    success(request.t("auth.login.success"), {
      user: {
        id: existingAccount.id,
        email: existingAccount.email,
        name: existingAccount.name,
      },
      sessionToken: rawToken,
      expiresAt,
    }),
  );
};

export const logout = async (request: FastifyRequest, reply: FastifyReply) => {
  const datasource = getAppDataSource();
  const sessionId = request.sessionId;
  const userId = request.userId;
  await datasource.manager.update(
    Session,
    { id: sessionId, userId: userId },
    {
      revokedAt: new Date(),
    },
  );

  return reply.code(200).send(success(request.t("auth.logout.success")));
};
