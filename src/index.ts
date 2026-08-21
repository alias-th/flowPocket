import "reflect-metadata";

import buildApp from "./app";

import closeWithGrace from "close-with-grace";
import { FastifyReply } from "fastify";
import { S3Client } from "@aws-sdk/client-s3";
import { DataSource } from "typeorm";

declare module "fastify" {
  interface FastifyInstance {
    db: DataSource;
    s3: S3Client;
    config: {
      APP_PORT: string;
      DB_HOST: string;
      DB_USER: string;
      DB_PASSWORD: string;
      DB_NAME: string;
      DB_PORT: string;
      SESSION_TOKEN_SECRET: string;
      S3_ACCOUNT_ID: string;
      S3_ACCESS_KEY_ID: string;
      S3_SECRET_ACCESS_KEY: string;
      S3_BUCKET_NAME: string;
      S3_PUBLIC_URL: string;
      ACCESS_TOKEN_TTL_SECONDS: string;
      REFRESH_TOKEN_TTL_SECONDS: string;
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

  await app.listen({
    port: Number(app.config.APP_PORT),
    host: "0.0.0.0",
  });

  closeWithGrace(async ({ signal, err }) => {
    app.log.info(`${signal} received, server closing`);

    if (err) {
      app.log.error({ err }, "server closing with error");
    }

    await app.close();
  });
};

start();
