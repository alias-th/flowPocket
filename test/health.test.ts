import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import type { DataSource } from "typeorm";
import healthRoutes from "../src/routes/health";

type HealthResponse = {
  status: "ok" | "unavailable";
  checks: {
    application: "up";
    database: "up" | "down";
  };
  uptimeSeconds?: number;
  timestamp: string;
};

function createDatabase(query: () => Promise<unknown>): DataSource {
  return { query } as unknown as DataSource;
}

test("GET /health returns 200 when database is available", async (t) => {
  const app = Fastify({ logger: false });
  t.after(async () => app.close());

  app.decorate("db", createDatabase(async () => [{ result: 1 }]));
  await app.register(healthRoutes);

  const response = await app.inject({ method: "GET", url: "/health" });
  const body = response.json<HealthResponse>();

  assert.equal(response.statusCode, 200);
  assert.equal(body.status, "ok");
  assert.deepEqual(body.checks, {
    application: "up",
    database: "up",
  });
  assert.equal(typeof body.uptimeSeconds, "number");
  assert.equal(Number.isNaN(Date.parse(body.timestamp)), false);
});

test("GET /health returns 503 when database is unavailable", async (t) => {
  const app = Fastify({ logger: false });
  t.after(async () => app.close());

  app.decorate(
    "db",
    createDatabase(async () => {
      throw new Error("Database unavailable");
    }),
  );
  await app.register(healthRoutes);

  const response = await app.inject({ method: "GET", url: "/health" });
  const body = response.json<HealthResponse>();

  assert.equal(response.statusCode, 503);
  assert.equal(body.status, "unavailable");
  assert.deepEqual(body.checks, {
    application: "up",
    database: "down",
  });
  assert.equal(body.uptimeSeconds, undefined);
  assert.equal(Number.isNaN(Date.parse(body.timestamp)), false);
});
