import "reflect-metadata";

import buildApp from "./app";
import { initializeDataSource } from "./data-source";

declare module "fastify" {
  interface FastifyInstance {
    config: {
      POSTGRES_HOST: string;
      POSTGRES_USER: string;
      POSTGRES_PASSWORD: string;
      POSTGRES_DB: string;
      POSTGRES_PORT: string;
    };
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
};

start();
