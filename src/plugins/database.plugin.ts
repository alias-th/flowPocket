import fp from "fastify-plugin";
import { DataSource } from "typeorm";

import { Account } from "../entities/account.entity";
import { Budget } from "../entities/budget.entity";
import { Category } from "../entities/category.entity";
import { Image } from "../entities/image.entity";
import { Session } from "../entities/session.entity";
import { Transaction } from "../entities/transaction.entity";
import { User } from "../entities/user.entity";

export default fp(async function databasePlugin(fastify) {
  const dataSource = new DataSource({
    type: "postgres",
    host: fastify.config.POSTGRES_HOST,
    port: Number(fastify.config.POSTGRES_PORT),
    username: fastify.config.POSTGRES_USER,
    password: fastify.config.POSTGRES_PASSWORD,
    database: fastify.config.POSTGRES_DB,
    entities: [Account, Budget, Category, Image, Session, Transaction, User],
    synchronize: false,
    logging: process.env.NODE_ENV !== "production",
  });

  await dataSource.initialize();

  fastify.decorate("db", dataSource);

  fastify.addHook("onClose", async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  fastify.log.info("Database connection initialized");
});
