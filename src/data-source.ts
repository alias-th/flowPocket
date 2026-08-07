import { DataSource } from "typeorm";

import { Category } from "./entities/category.entity";
import { Account } from "./entities/account.entity";
import { Budget } from "./entities/budget.entity";
import { Image } from "./entities/image.entity";
import { Session } from "./entities/session.entity";
import { Transaction } from "./entities/transaction.entity";
import { User } from "./entities/user.entity";

export type DatabaseConfig = {
  POSTGRES_HOST: string;
  POSTGRES_PORT: string;
  POSTGRES_USER: string;
  POSTGRES_PASSWORD: string;
  POSTGRES_DB: string;
};

let appDataSource: DataSource | undefined;

export function initializeDataSource(config: DatabaseConfig): DataSource {
  appDataSource = new DataSource({
    type: "postgres",
    host: config.POSTGRES_HOST,
    port: Number(config.POSTGRES_PORT),
    username: config.POSTGRES_USER,
    password: config.POSTGRES_PASSWORD,
    database: config.POSTGRES_DB,
    entities: [Account, Category, Budget, Image, Session, Transaction, User],
    logging: process.env.NODE_ENV !== "production",
    synchronize: false,
  });

  return appDataSource;
}

export function getAppDataSource(): DataSource {
  if (!appDataSource) {
    throw new Error("Data source has not been initialized.");
  }

  return appDataSource;
}
