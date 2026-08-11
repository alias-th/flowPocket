import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyEnv from "@fastify/env";
import multipart from "@fastify/multipart";
import path from "node:path";
import i18next from "i18next";
import Backend from "i18next-fs-backend";
import middleware from "i18next-http-middleware";
import authRoutes from "./routes/auth";
import accountRoutes from "./routes/account";
import { fail } from "./utils/response";
import protectRoutePlugin from "./plugins/protectRoute.plugin";
import categoryRoutes from "./routes/category";
import transactionRoutes from "./routes/transaction";
import imageRoutes from "./routes/image";
import budgetRoutes from "./routes/budget";
import reportRoutes from "./routes/report";
import s3Storage from "./plugins/s3.plugin";
import sessionRoutes from "./routes/session";

const envOptions = {
  dotenv: true,
  schema: {
    type: "object",
    required: [
      "POSTGRES_HOST",
      "POSTGRES_USER",
      "POSTGRES_PASSWORD",
      "POSTGRES_DB",
      "POSTGRES_PORT",
      "SESSION_TOKEN_SECRET",
    ],
    properties: {
      PORT: {
        type: "string",
        default: "8080",
      },
      POSTGRES_HOST: {
        type: "string",
      },
      POSTGRES_USER: {
        type: "string",
      },
      POSTGRES_PASSWORD: {
        type: "string",
      },
      POSTGRES_DB: {
        type: "string",
      },
      POSTGRES_PORT: {
        type: "string",
      },
      SESSION_TOKEN_SECRET: {
        type: "string",
        minLength: 32,
      },
      S3_ACCOUNT_ID: {
        type: "string",
      },
      S3_ACCESS_KEY_ID: {
        type: "string",
      },
      S3_SECRET_ACCESS_KEY: {
        type: "string",
      },
      S3_BUCKET_NAME: {
        type: "string",
      },
      S3_PUBLIC_URL: {
        type: "string",
      },
    },
  },
};

async function buildApp() {
  let logger;

  if (process.stdout.isTTY) {
    logger = {
      transport: {
        target: "pino-pretty",
      },
    };
  } else {
    logger = true;
  }

  await i18next
    .use(Backend)
    .use(middleware.LanguageDetector)
    .init({
      fallbackLng: "en",
      supportedLngs: ["en", "th"],
      preload: ["en", "th"],
      ns: ["common"],
      defaultNS: "common",
      backend: {
        loadPath: path.join(process.cwd(), "src/locales/{{lng}}/{{ns}}.json"),
      },
      detection: {
        order: ["header"],
        lookupHeader: "accept-language",
        caches: false,
      },
    });

  const fastify = Fastify({ bodyLimit: 50 * 1024 * 1024, logger: logger });
  await fastify.register(cors);
  await fastify.register(fastifyEnv, envOptions);

  fastify.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  fastify.register(middleware.plugin, { i18next });
  fastify.register(protectRoutePlugin);
  fastify.register(s3Storage, {
    ACCOUNT_ID: fastify.config.S3_ACCOUNT_ID,
    ACCESS_KEY_ID: fastify.config.S3_ACCESS_KEY_ID!,
    SECRET_ACCESS_KEY: fastify.config.S3_SECRET_ACCESS_KEY!,
  });

  // Register routes
  const apiVersion = "/api/v1";
  fastify.register(authRoutes, { prefix: `${apiVersion}/auth` });
  fastify.register(accountRoutes, { prefix: `${apiVersion}/accounts` });
  fastify.register(categoryRoutes, { prefix: `${apiVersion}/categories` });
  fastify.register(transactionRoutes, { prefix: `${apiVersion}/transactions` });
  fastify.register(imageRoutes, { prefix: `${apiVersion}/images` });
  fastify.register(budgetRoutes, { prefix: `${apiVersion}/budgets` });
  fastify.register(sessionRoutes, { prefix: `${apiVersion}/sessions` });
  fastify.register(reportRoutes, { prefix: `${apiVersion}/reports` });

  // Set global error handlers
  fastify.setErrorHandler(async (error: any, request, reply) => {
    request.log.error({ err: error }, "Request failed");

    const statusCode = error.statusCode ?? 500;
    reply.code(statusCode);

    return fail(
      statusCode >= 500
        ? request.t("common.internalServerError")
        : error.message,
      statusCode,
      error.details,
    );
  });
  fastify.setNotFoundHandler(async (_request, reply) => {
    reply.code(404);
    return fail(_request.t("common.routeNotFound"), 404);
  });

  return fastify;
}

export default buildApp;
