# Project Overview

FlowPocket is a REST API for personal income and expense tracking.

Core features:

- Authentication and session management
- Accounts
- Categories
- Transactions and transaction images
- Budgets
- Financial reports
- Data export

# Tech Stack

- Node.js
- TypeScript with strict mode
- Fastify
- Joi request validation
- TypeORM
- PostgreSQL
- S3-compatible object storage
- i18next
- Docker and Docker Compose

# Source Map

- `src/app.ts`: application composition, plugins, routes, validation, and global error handling
- `src/routes/`: endpoint definitions, schemas, and authentication hooks
- `src/controllers/`: request handling, business rules, authorization, and database orchestration
- `src/schemas/`: Joi request schemas
- `src/entities/`: TypeORM entities and relationships
- `src/migrations/`: versioned database migrations
- `src/plugins/`: Fastify authentication, database, and storage plugins
- `src/utils/`: shared errors, responses, validation, dates, tokens, and storage helpers
- `src/locales/`: localized API messages for `en` and `th`
- `docs/API.md`: API contract documentation
- `docs/BUSSINESS_FLOW.md`: business-flow documentation
- `docs/db.sql`: database reference; migrations remain the source of truth for schema evolution

# Architecture

The current application flow is:

```text
Route -> Controller -> TypeORM DataSource / Repository -> PostgreSQL
```

Do not assume a `Service` or custom `Repository` layer exists. Follow the current feature's pattern and keep changes local.

For new or substantially expanded features:

- Routes define HTTP method, URL, request schema, authentication hook, and controller handler.
- Controllers translate HTTP input/output, enforce authorization and business rules, and orchestrate database operations.
- Joi schemas validate all external params, query strings, and JSON bodies.
- TypeORM entities and query builders handle persistence.
- Shared behavior belongs in an existing utility when it is truly reusable.

Introduce a Service only when business logic is complex, reused by multiple entry points, or needs an independently testable transaction boundary. Do not refactor unrelated existing controllers merely to introduce layers.

# API Conventions

- Keep versioned endpoints under `/api/v1`.
- Define request validation in `src/schemas/` and attach it in the route.
- Use `success()` and `fail()` from `src/utils/response.ts` for response envelopes.
- Throw `AppError` for expected client-facing errors and let the global error handler format them.
- Do not expose raw TypeORM, PostgreSQL, storage-provider, or internal error messages.
- Use `request.t(...)` and update both `src/locales/en/common.json` and `src/locales/th/common.json` when adding client-facing messages.
- Preserve existing status codes and response shapes unless the task explicitly changes the public API.
- Update `docs/API.md` and the Postman collection when an endpoint contract changes materially.

# TypeScript and Coding Rules

- Preserve strict TypeScript behavior, including `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- Do not use `any`; narrow `unknown` values explicitly.
- Reuse existing entities, schemas, errors, response helpers, and utilities before creating new abstractions.
- Keep imports and naming consistent with nearby files.
- Keep changes minimal and do not refactor unrelated code.
- Do not add or upgrade dependencies unless the task requires it and the benefit is clear.
- Do not edit generated output in `dist/`; change `src/` and rebuild.
- Add comments only when they explain a non-obvious decision, invariant, or workaround.

# Authentication and Authorization

- Protected routes use `fastify.authentication` as a `preHandler`.
- Obtain the authenticated user with `checkNotNullUserId(request)`.
- Scope every user-owned database read and write by `userId`; knowing a resource UUID is not authorization.
- Verify ownership of related resources such as accounts, categories, budgets, transactions, images, and sessions before using or modifying them.
- Return the existing not-found or unauthorized behavior instead of revealing whether another user's resource exists.
- Never expose password hashes, access-token hashes, refresh-token hashes, raw session tokens, or secrets.
- Never log passwords, bearer tokens, cookies, secret keys, or sensitive request payloads.
- Keep raw tokens out of the database; store only the established token hashes.

# Input and File Security

- Validate all external input with Joi or the established multipart validation utility.
- Keep unknown-field behavior consistent with the global validator.
- Do not trust filename extensions or client-provided MIME types for uploads.
- Preserve file-count and size limits unless a requirement explicitly changes them.
- For operations spanning object storage and PostgreSQL, handle partial failure and cleanup explicitly.
- Avoid returning storage credentials or internal object keys when a public URL is sufficient.

# Database Rules

- PostgreSQL and TypeORM migrations are the source of truth for schema changes.
- Keep `synchronize: false`; never depend on schema synchronization.
- Use `timestamptz` for instants and preserve the project's Bangkok timezone semantics for reporting periods.
- Monetary columns use PostgreSQL `decimal`; avoid JavaScript floating-point arithmetic for persisted financial calculations.
- Use a database transaction when multiple database writes must commit or roll back together.
- Consider concurrent requests, retries, uniqueness conflicts, and idempotency for shared financial state.
- Avoid N+1 queries; batch related reads or join intentionally.
- Add an index or constraint only when its query pattern or invariant is identified.
- Make migrations deterministic and reversible where practical. Consider existing data, locks, backfills, deployment order, and rollback.
- Do not run migrations against a shared, staging, or production database without explicit user authorization.
- Migration scripts in `package.json` currently contain a fixed migration basename. Inspect and adjust the intended command before generating a new migration; do not overwrite an unrelated migration.

# Date, Time, and Money

- Treat API timestamps as explicit instants and persist them as `timestamptz`.
- Reuse date utilities in `src/utils/date.ts` for reporting periods.
- Add boundary coverage for month changes, year changes, and the `Asia/Bangkok` timezone when changing report filters.
- Preserve decimal precision. Convert monetary values deliberately and document rounding rules when calculations are introduced.

# Testing and Verification

The repository currently has no automated test runner and no `test` or `typecheck` script. Do not claim tests passed when no test command exists, and do not invent placeholder scripts as part of an unrelated task.

After changing source code, run:

```bash
npm run lint
npm run build
```

`npm run build` is the current TypeScript compilation check.

Also:

1. Run any relevant test command that exists after confirming it in `package.json`.
2. Inspect the final diff with `git diff --check` and `git diff`.
3. Check `git status --short` and distinguish pre-existing user changes from agent changes.
4. Report commands that were not run, failures, and verification gaps accurately.

For documentation-only changes, source lint/build are optional unless the documentation changes executable commands or code contracts. Still run `git diff --check` and inspect the final diff.

# Agent Workflow

Before a non-trivial change:

1. Read the relevant code, schemas, entities, migrations, and documentation.
2. Identify the current implementation pattern and affected files.
3. Confirm the public API, ownership boundary, database impact, and failure cases.
4. Make the smallest coherent change that satisfies the request.

During implementation:

- Preserve unrelated user changes in a dirty worktree.
- Do not modify unrelated files or broaden the task into a general refactor.
- Ask before making an ambiguous decision that materially changes architecture, database design, security behavior, public API compatibility, or external systems.
- Ask before destructive actions, external writes, deployment, or running migrations against non-local data.

After implementation:

- Review the diff for correctness, security, missing validation, and unrelated changes.
- Summarize what changed and why.
- List important files changed.
- Report verification commands and their outcomes.
- Mention remaining risks, assumptions, and missing test coverage.

# Documentation and Communication

- Write summaries and reasoning for the user in Thai.
- Keep code, identifiers, filenames, API names, SQL, and technical terminology in English.
- Keep repository documentation consistent with implemented behavior; do not guess undocumented contracts.
- Prefer concise, actionable explanations with file references when reporting findings.
