import dotenv from "dotenv";
import { DataSource } from "typeorm";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? "5432"),
  username: process.env.DB_USER ?? "",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "",
  logging: true,
  entities: [__dirname + "/entities/**/*{.js,.ts}"],
  migrations: [__dirname + "/migrations/**/*{.js,.ts}"],
  synchronize: false,
  migrationsRun: false,
  migrationsTableName: "migrations",
  migrationsTransactionMode: "all",
});
