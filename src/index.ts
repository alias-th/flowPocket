import "reflect-metadata";

import buildApp from "./app";

import { initializeDataSource } from "./data-source";
import closeWithGrace from "close-with-grace";
import { FastifyReply } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    config: {
      POSTGRES_HOST: string;
      POSTGRES_USER: string;
      POSTGRES_PASSWORD: string;
      POSTGRES_DB: string;
      POSTGRES_PORT: string;
      SESSION_TOKEN_SECRET: string;
    };

    authentication(request: FastifyRequest, reply: FastifyReply): void;
  }

  interface FastifyRequest {
    userId: string | null;
    sessionId: string | null;
  }
}

const start = async () => {
  const app = await buildApp();

  const appDataSource = initializeDataSource(app.config);

  try {
    await appDataSource.initialize();
    console.log("Data Source has been initialized!");

    await app.listen({
      port: Number(process.env.PORT ?? 8080),
      host: "0.0.0.0",
    });
  } catch (error) {
    app.log.error(error, "Failed to start application");
    if (appDataSource.isInitialized) {
      await appDataSource.destroy();
    }
    process.exit(1);
  }

  closeWithGrace(async ({ signal, err }) => {
    app.log.info(`${signal} received, server closing`);

    if (err) {
      app.log.error({ err }, "server closing with error");
    }

    await app.close();

    if (appDataSource.isInitialized) {
      await appDataSource.destroy();
    }
  });
};

start();
