import dotenv from "dotenv";
import { DataSource } from "typeorm";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.POSTGRES_HOST ?? "localhost",
  port: Number(process.env.POSTGRES_PORT ?? "5432"),
  username: process.env.POSTGRES_USER ?? "",
  password: process.env.POSTGRES_PASSWORD ?? "",
  database: process.env.POSTGRES_DB ?? "",
  logging: true,
  entities: [__dirname + "/entities/**/*{.js,.ts}"],
  migrations: [__dirname + "/migrations/**/*{.js,.ts}"],
  synchronize: false,
  migrationsRun: false,
  migrationsTableName: "migrations",
  migrationsTransactionMode: "all",
});
