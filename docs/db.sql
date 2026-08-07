CREATE TYPE "language" AS ENUM (
  'TH',
  'EN'
);

CREATE TYPE "account_type" AS ENUM (
  'BANK',
  'CASH',
  'EWALLET',
  'CREDIT_CARD',
  'OTHER'
);

CREATE TYPE "account_currency" AS ENUM (
  'THB',
  'USD'
);

CREATE TYPE "account_status" AS ENUM (
  'ACTIVE',
  'INACTIVE'
);

CREATE TYPE "transaction_type" AS ENUM (
  'INCOME',
  'EXPENSE',
  'OPENING_BALANCE'
);

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "email" varchar UNIQUE NOT NULL,
  "password_hash" varchar NOT NULL,
  "name" varchar NOT NULL,
  "preferred_language" language NOT NULL DEFAULT 'TH',
  "created_at" timestamp NOT NULL DEFAULT ( now()),
  "updated_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "accounts" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid NOT NULL,
  "name" varchar NOT NULL,
  "type" account_type NOT NULL DEFAULT 'BANK',
  "currency" account_currency NOT NULL DEFAULT 'THB',
  "account_status" account_status NOT NULL DEFAULT 'ACTIVE',
  "created_at" timestamp NOT NULL DEFAULT ( now()),
  "updated_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "categories" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid NOT NULL,
  "name" varchar NOT NULL,
  "type" transaction_type NOT NULL,
  "category_status" bool NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "transactions" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid NOT NULL,
  "account_id" uuid NOT NULL,
  "category_id" uuid,
  "type" transaction_type NOT NULL,
  "amount" decimal(15,2) NOT NULL,
  "note" text,
  "transaction_date" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "sessions" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid NOT NULL,
  "token_hash" varchar UNIQUE NOT NULL,
  "device_name" varchar,
  "user_agent" text,
  "ip_address" varchar,
  "expires_at" timestamp NOT NULL,
  "revoked_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "images" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "transaction_id" uuid NOT NULL,
  "file_key" varchar NOT NULL,
  "file_name" varchar NOT NULL,
  "mime_type" varchar,
  "file_size" integer,
  "created_at" timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE "budgets" (
  "id" uuid PRIMARY KEY DEFAULT (gen_random_uuid()),
  "user_id" uuid NOT NULL,
  "category_id" uuid NOT NULL,
  "amount" decimal(15,2) NOT NULL,
  "month" int NOT NULL,
  "year" int NOT NULL,
  "currency" account_currency NOT NULL DEFAULT 'THB',
  "created_at" timestamp NOT NULL DEFAULT (now()),
  "updated_at" timestamp NOT NULL DEFAULT (now())
);

CREATE INDEX ON "accounts" ("user_id");

CREATE INDEX ON "categories" ("user_id");

CREATE INDEX ON "transactions" ("user_id");

CREATE INDEX ON "transactions" ("account_id");

CREATE INDEX ON "transactions" ("category_id");

CREATE INDEX ON "sessions" ("user_id");

CREATE INDEX ON "sessions" ("expires_at");

CREATE INDEX ON "images" ("transaction_id");

CREATE INDEX ON "budgets" ("user_id");

COMMENT ON COLUMN "accounts"."user_id" IS 'one to many / user สามารถมีได้หลาย account';

COMMENT ON COLUMN "transactions"."account_id" IS 'one to many';

COMMENT ON COLUMN "transactions"."category_id" IS 'one to many';

ALTER TABLE "accounts" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "categories" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "transactions" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "transactions" ADD FOREIGN KEY ("account_id") REFERENCES "accounts" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "transactions" ADD FOREIGN KEY ("category_id") REFERENCES "categories" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "sessions" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "images" ADD FOREIGN KEY ("transaction_id") REFERENCES "transactions" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "budgets" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "budgets" ADD FOREIGN KEY ("category_id") REFERENCES "categories" ("id") DEFERRABLE INITIALLY IMMEDIATE;
