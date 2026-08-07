import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyEnv from "@fastify/env";
import multipart from "@fastify/multipart";

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
  const fastify = Fastify({ bodyLimit: 50 * 1024 * 1024 });
  await fastify.register(cors);
  await fastify.register(fastifyEnv, envOptions);

  fastify.register(multipart, {
    limits: { files: 5 * 1024 * 1024 },
  });

  // Register routes
  const apiVersion = "/api/v1";

  // Set error handlers
  fastify.setErrorHandler(async function (error: any, request, reply) {
    request.log.error({ error });
    reply.code(error.statusCode ?? 500);
    return { error: { message: error.message, statusCode: error.statusCode } };
  });
  fastify.setNotFoundHandler(async (_request, reply) => {
    reply.code(404);
    return { error: { message: "Route is not found." } };
  });

  return fastify;
}

export default buildApp;
