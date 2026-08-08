import { FastifyReply, FastifyRequest } from "fastify";
import { success } from "../utils/response";
import { registerSchema } from "../schemas/auth.schema";
import { validateAndThrowError } from "../utils/validation";
import { getAppDataSource } from "../data-source";
import { PreferredLanguage, User } from "../entities/user.entity";
import { AppError } from "../utils/app-error";
import bcrypt from "bcrypt";

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
