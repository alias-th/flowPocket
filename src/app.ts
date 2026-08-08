import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyEnv from "@fastify/env";
import multipart from "@fastify/multipart";
import path from "node:path";
import i18next from "i18next";
import Backend from "i18next-fs-backend";
import middleware from "i18next-http-middleware";
import authRoutes from "./routes/auth";
import { fail } from "./utils/response";

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
    ],
    properties: {
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

  // Register routes
  const apiVersion = "/api/v1";
  fastify.register(authRoutes, { prefix: `${apiVersion}/auth` });

  // Set global error handlers
  fastify.setErrorHandler(async (error: any, request, reply) => {
    request.log.error({ err: error }, "Request failed");

    const statusCode = error.statusCode ?? 500;
    reply.code(statusCode);

    return fail(
      statusCode >= 500 ? "Internal server error" : error.message,
      statusCode,
      error.details,
    );
  });
  fastify.setNotFoundHandler(async (_request, reply) => {
    reply.code(404);
    return fail("Route is not found.", 404);
  });

  return fastify;
}

export default buildApp;
