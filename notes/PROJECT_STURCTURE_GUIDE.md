# Production Project Structure Guide สำหรับ FlowPocket

เอกสารนี้เสนอ project structure สำหรับพัฒนา FlowPocket ให้ดูแลและทดสอบง่ายเมื่อระบบโตขึ้น โดยยึด stack ปัจจุบัน: Node.js, TypeScript, Fastify, Joi, TypeORM, PostgreSQL, S3-compatible storage และ Docker

ข้อเสนอหลักคือใช้ **modular monolith แบบ feature-based** ก่อน ไม่จำเป็นต้องแยก microservices ตั้งแต่ต้น แต่สร้างขอบเขตของแต่ละ business feature ให้ชัดพอที่จะพัฒนา ทดสอบ และเปลี่ยนแปลงได้อย่างอิสระ

> นี่คือ target structure ไม่ใช่คำสั่งให้ refactor ทั้ง repository ในครั้งเดียว ควรย้ายทีละ feature เมื่อมีงานที่เกี่ยวข้องและมี tests รองรับ

## 1. เป้าหมายของโครงสร้าง

โครงสร้างสำหรับ production ควรช่วยให้:

- หา code ของ feature หนึ่งได้จาก directory เดียว
- แยก HTTP, business logic และ database access ออกจากกัน
- ตรวจ authorization และ business invariants ได้ในจุดที่สม่ำเสมอ
- ทดสอบ Service โดยไม่ต้องสร้าง HTTP server หรือเชื่อมต่อ storage จริง
- เปลี่ยน database query โดยไม่กระทบ API contract
- ใช้ database transaction ครอบหลาย writes ได้ชัดเจน
- ลด circular dependency และการ import ข้าม feature โดยพลการ
- deploy เป็น application เดียวได้ง่าย และยังแยก service ในอนาคตได้ถ้ามีเหตุผลจริง

## 2. โครงสร้างที่แนะนำ

```text
flowPocket/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── publish-image.yml
│       └── deploy.yml
├── docs/
│   ├── API.md
│   ├── BUSSINESS_FLOW.md
│   └── architecture/
│       ├── decisions/
│       └── diagrams/
├── notes/
├── src/
│   ├── app.ts
│   ├── index.ts
│   ├── config/
│   │   ├── env.schema.ts
│   │   └── env.ts
│   ├── infrastructure/
│   │   ├── database/
│   │   │   ├── datasource.ts
│   │   │   ├── migrations/
│   │   │   └── database.plugin.ts
│   │   ├── storage/
│   │   │   ├── s3.client.ts
│   │   │   ├── s3.storage.ts
│   │   │   └── s3.plugin.ts
│   │   └── observability/
│   │       ├── logger.ts
│   │       └── telemetry.ts
│   ├── plugins/
│   │   ├── authentication.plugin.ts
│   │   ├── error-handler.plugin.ts
│   │   └── i18n.plugin.ts
│   ├── features/
│   │   ├── auth/
│   │   │   ├── auth.route.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.repository.ts
│   │   │   ├── auth.schema.ts
│   │   │   ├── auth.types.ts
│   │   │   └── auth.test.ts
│   │   ├── transactions/
│   │   │   ├── AGENTS.md
│   │   │   ├── transaction.route.ts
│   │   │   ├── transaction.controller.ts
│   │   │   ├── transaction.service.ts
│   │   │   ├── transaction.repository.ts
│   │   │   ├── transaction.entity.ts
│   │   │   ├── transaction.schema.ts
│   │   │   ├── transaction.mapper.ts
│   │   │   ├── transaction.types.ts
│   │   │   └── transaction.test.ts
│   │   ├── accounts/
│   │   ├── categories/
│   │   ├── budgets/
│   │   ├── reports/
│   │   ├── sessions/
│   │   └── export/
│   ├── shared/
│   │   ├── errors/
│   │   ├── http/
│   │   ├── security/
│   │   ├── time/
│   │   ├── money/
│   │   └── types/
│   └── test/
│       ├── factories/
│       ├── fixtures/
│       ├── helpers/
│       └── setup.ts
├── test/
│   └── e2e/
├── AGENTS.md
├── Dockerfile
├── compose.dev.yaml
├── compose.prod.yaml
├── package.json
└── tsconfig.json
```

ไม่จำเป็นต้องสร้างทุก directory ล่วงหน้า ให้สร้างเมื่อมี code จริงเท่านั้น Directory ว่างและ abstraction ที่ยังไม่มีผู้ใช้เพิ่มภาระมากกว่าประโยชน์

## 3. Request Flow ที่แนะนำ

```text
HTTP Request
    │
    ▼
Route
    ├── method, URL, schema
    ├── authentication hook
    └── controller binding
    │
    ▼
Controller
    ├── read validated request data
    ├── call Service
    └── map result to HTTP response
    │
    ▼
Service
    ├── business rules
    ├── authorization and ownership
    ├── transaction orchestration
    └── calls repositories/adapters
    │
    ▼
Repository / Adapter
    ├── TypeORM query
    ├── PostgreSQL persistence
    └── external storage/provider access
```

หลักสำคัญคือ dependency ไหลเข้าหา business logic ไม่ใช่ให้ Service ผูกกับ Fastify โดยตรง:

```text
Route -> Controller -> Service -> Repository interface/implementation
```

Service ไม่ควรรับ `FastifyRequest` หรือ `FastifyReply` ให้รับ typed input เช่น `CreateTransactionInput` พร้อม `userId` ที่ controller ดึงจาก authenticated request แล้ว

## 4. หน้าที่ของแต่ละ Layer

### Route

รับผิดชอบ:

- HTTP method และ URL
- Joi request schema
- authentication/authorization pre-handler ที่เป็น HTTP concern
- route prefix และ controller binding

ไม่ควรมี:

- TypeORM query
- business calculation
- response data mapping ที่ซับซ้อน

### Controller

รับผิดชอบ:

- อ่าน `params`, `query`, `body` และ authenticated context
- เรียก Service
- เลือก status code
- สร้าง response envelope ด้วย utility มาตรฐาน

Controller ควรบางพอให้อ่านแล้วเห็น HTTP contract ได้ทันที

### Service

รับผิดชอบ:

- business rules และ domain invariants
- resource ownership
- workflow ที่เรียกหลาย repositories หรือ adapters
- database transaction boundary
- ตัดสิน expected domain errors

Service ไม่ควร:

- ส่ง Fastify response
- รู้จัก header หรือ cookie โดยไม่จำเป็น
- สร้าง SQL/query builder โดยตรงหากมี Repository แล้ว
- แปลง internal error เป็นข้อความ database ที่ส่งให้ client

### Repository

รับผิดชอบ:

- TypeORM repository และ query builder
- filter, join, pagination และ lock
- mapping persistence-specific data
- รับ `EntityManager` เมื่อ Service ต้องควบคุม transaction

Repository ไม่ควรตัดสิน HTTP status code หรือแปลข้อความให้ผู้ใช้

### Mapper

ใช้เมื่อ entity และ API response ต่างกันชัดเจน เช่น:

- ตัด internal fields
- แปลง decimal/date อย่างสม่ำเสมอ
- รวม public image URL
- สร้าง DTO โดยไม่ส่ง TypeORM entity ออกตรง ๆ

ถ้า mapping สั้นและใช้ที่เดียว สามารถอยู่ใน Controller ได้ ไม่ต้องสร้าง mapper ทุก feature

## 5. Feature Module ตัวอย่าง

ตัวอย่าง `transactions` feature:

```text
src/features/transactions/
├── transaction.route.ts
├── transaction.controller.ts
├── transaction.service.ts
├── transaction.repository.ts
├── transaction.entity.ts
├── transaction.schema.ts
├── transaction.mapper.ts
├── transaction.types.ts
└── transaction.test.ts
```

Dependency ภายใน feature:

```text
transaction.route.ts
        │
        ▼
transaction.controller.ts
        │
        ▼
transaction.service.ts
        │
        ▼
transaction.repository.ts
        │
        ▼
transaction.entity.ts
```

กฎที่แนะนำ:

- Feature อื่นเรียก public Service ของ feature ไม่ import Repository ภายในโดยตรง
- หลีกเลี่ยงการ import Controller, Route หรือ Joi schema ข้าม feature
- ถ้า features สองตัวต้องแก้ข้อมูลร่วมกัน ให้ Service เจ้าของ use case เป็นตัว orchestrate
- ถ้า shared code มี business meaning เฉพาะ feature ให้เก็บใน feature ไม่ย้ายเข้า `shared/` เพียงเพราะถูกใช้สองครั้ง
- Export เฉพาะ public API ของ feature ผ่าน `index.ts` เมื่อช่วยจำกัด dependency ได้จริง

## 6. Fastify Plugins และ Encapsulation

Fastify `register()` สร้าง scope ใหม่ตามค่าเริ่มต้น Child plugin เข้าถึง decorators และ plugins จาก parent ได้ แต่ parent ไม่เห็นสิ่งที่ประกาศเฉพาะใน child scope จึงเหมาะกับการประกอบ feature routes เป็น cohesive modules

ตัวอย่าง composition ใน `app.ts`:

```ts
await app.register(configPlugin);
await app.register(databasePlugin);
await app.register(authenticationPlugin);

await app.register(authRoutes, { prefix: "/api/v1/auth" });
await app.register(transactionRoutes, { prefix: "/api/v1/transactions" });
await app.register(reportRoutes, { prefix: "/api/v1/reports" });
```

ใช้ `fastify-plugin` เมื่อ plugin ต้อง expose decorator ให้ scope อื่นอย่างตั้งใจ เช่น database connection หรือ authentication decorator อย่า wrap ทุก route plugin ด้วย `fastify-plugin` เพราะจะทำลาย encapsulation โดยไม่จำเป็น

## 7. Config และ Environment

แยกการอ่าน environment variables ไว้ที่ composition boundary:

```text
src/config/
├── env.schema.ts
└── env.ts
```

กฎสำหรับ production:

- validate required variables ตอน startup และ fail fast
- แปลง port, TTL และ boolean เป็น type ที่ถูกต้องครั้งเดียว
- application code รับ typed config ไม่อ่าน `process.env` กระจายทั่วระบบ
- commit เฉพาะ `.env.example` ที่ไม่มี secret
- secrets มาจาก deployment environment หรือ secret manager
- แยก config validation ออกจาก TypeORM `DataSource` เพื่อทดสอบได้

## 8. Database และ Migrations

โครงสร้างที่แนะนำ:

```text
src/infrastructure/database/
├── datasource.ts
├── database.plugin.ts
└── migrations/
```

กฎสำคัญ:

- ใช้ migrations เป็น source of truth
- คง `synchronize: false`
- build image ต้องมี compiled migrations
- migration command ต้องรับชื่อ migration ใหม่ ไม่ hard-code basename เก่า
- schema migration และ data backfill ขนาดใหญ่ควรแยกขั้นเมื่อมี lock/downtime risk
- รัน migration เป็น deployment job เดียวก่อนเริ่ม application revision ใหม่
- ห้ามให้ทุก application replica แข่งกันรัน migration ตอน startup
- ออกแบบ change แบบ backward-compatible เมื่อ rolling deployment มี app สอง versions ทำงานพร้อมกัน

เมื่อ Service ต้องทำหลาย writes:

```ts
return dataSource.transaction(async (manager) => {
  const transactionRepository = createTransactionRepository(manager);
  const accountRepository = createAccountRepository(manager);

  // ทุก operation ใน block ต้องใช้ manager ตัวนี้
});
```

อย่าใช้ global repository ภายใน transaction callback เพราะ query อาจหลุดออกจาก transaction เดียวกัน

## 9. Money และ Time

ระบบการเงินควรมีกฎเฉพาะที่ชัดเจน:

- PostgreSQL `decimal` เป็น source of truth สำหรับจำนวนเงิน
- อย่าคำนวณเงินด้วย JavaScript `number` เมื่อ precision มีผล
- กำหนด rounding policy ก่อนสร้าง summary หรือ conversion
- เก็บ instant ด้วย `timestamptz`
- แยก instant ออกจาก business calendar เช่นเดือนรายงานของ `Asia/Bangkok`
- query date range แบบ half-open interval: `start <= value < end`
- test จุดเปลี่ยนเดือน ปี และ timezone offset

ถ้ามี money/time utility หลาย feature ใช้ร่วมกัน ค่อยสร้าง `src/shared/money/` และ `src/shared/time/` พร้อม tests

## 10. Error Handling และ API Contract

แบ่ง error เป็นสองกลุ่ม:

- Expected errors: validation, unauthorized, forbidden, not found, conflict และ business rule violation
- Unexpected errors: database unavailable, programming error, storage failure ที่ไม่ได้จัดการ

แนวทาง:

- Service throw typed application/domain error
- global error handler map error เป็น status code และ response envelope
- log unexpected error พร้อม request correlation แต่ไม่ส่ง stack หรือ internal message ให้ client
- ห้ามตรวจ unique violation ด้วยข้อความ error; ใช้ driver code และ constraint name
- update ทั้ง `en` และ `th` locale เมื่อเพิ่ม client-facing message
- API response ต้องไม่ส่ง TypeORM entity ออกโดยไม่เลือก fields

## 11. Testing Structure

แนะนำให้มีสามระดับ:

### Unit tests

- ทดสอบ Service และ pure utilities
- mock Repository หรือ adapter boundary
- ไม่เปิด Fastify server และไม่ต่อ database จริง

### Integration tests

- ทดสอบ TypeORM repositories, migrations และ PostgreSQL behavior
- ใช้ test database แยกจาก development/production
- reset data อย่าง deterministic
- ครอบ unique constraints, transactions, decimal และ timezone queries

### API tests

- สร้าง app ด้วย `buildApp()` และใช้ Fastify injection
- ทดสอบ schema, authentication, status code และ response shape
- ไม่ต้อง bind network port สำหรับ test ส่วนใหญ่

โครงสร้างตัวอย่าง:

```text
src/features/transactions/transaction.service.test.ts
src/features/transactions/transaction.repository.integration.test.ts
test/e2e/transactions.e2e.test.ts
```

CI ควรมี commands ที่ไม่เข้า watch mode:

```bash
npm run lint
npm run build
npm run test:unit
npm run test:integration
```

FlowPocket ยังไม่มี test runner จึงต้องเลือกเครื่องมือและเพิ่ม scripts จริงก่อนนำ commands ตัวอย่างไปใช้

## 12. Observability สำหรับ Production

ควรมี:

- structured logs ผ่าน Fastify/Pino
- request ID หรือ correlation ID
- health endpoint แยก readiness และ liveness เมื่อ infrastructure ต้องการ
- metrics สำหรับ latency, error rate, request count และ database pool
- traces สำหรับ request ที่เรียก database/storage หลายขั้นเมื่อระบบซับซ้อนขึ้น
- error reporting ที่ redact secrets และ personal data

Log event ควรมีชื่อคงที่และ fields ที่ค้นหาได้ อย่าประกอบข้อมูลทั้งหมดเป็นข้อความ string และอย่า log token, password, cookie, S3 key secret หรือ payload ทางการเงินโดยไม่จำเป็น

## 13. Background Jobs และ Export

งานที่ใช้เวลานานหรือ retry ได้ เช่น export ขนาดใหญ่, cleanup images และ scheduled summaries ไม่ควรยึด HTTP request ไว้นาน

เมื่อมี requirement จริง ค่อยเพิ่ม:

```text
src/jobs/
├── handlers/
├── queues/
└── workers/
```

หลักสำคัญ:

- job payload มี version และข้อมูลเท่าที่จำเป็น
- handler ต้อง idempotent หรือมี deduplication strategy
- retry ต้องแยก transient error ออกจาก permanent error
- มี timeout, dead-letter handling และ observability
- transaction ใน PostgreSQL ไม่ครอบ external queue/S3 โดยอัตโนมัติ พิจารณา outbox pattern เมื่อ consistency จำเป็น

อย่าเพิ่ม queue infrastructure หากงานปัจจุบันยังทำแบบ synchronous ได้อย่างปลอดภัยและมีขนาดเล็ก

## 14. Production Deployment Structure

แยก workflow ตามหน้าที่:

```text
.github/workflows/
├── ci.yml               # lint, build, tests, image build validation
├── publish-image.yml    # push immutable image
└── deploy.yml           # migration, deploy, smoke test, rollback signal
```

หลักการ:

- build image ครั้งเดียวแล้ว promote artifact เดิม
- deploy ด้วย immutable tag หรือ digest ไม่ใช้ `latest`
- migration ต้องจบสำเร็จก่อน application revision ที่พึ่ง schema ใหม่
- ใช้ staging และ production environments แยก secrets/approval
- container รันด้วย non-root user เมื่อทำได้
- มี graceful shutdown, health check และ rollback procedure
- จำกัด database และ object-storage credentials ตาม least privilege

## 15. สิ่งที่ไม่แนะนำให้ทำตั้งแต่ต้น

- แยก microservices โดยยังไม่มี independent scaling, ownership หรือ deployment need
- สร้าง generic BaseService/BaseRepository ที่ซ่อน TypeORM โดยไม่มี use case
- ใช้ dependency injection framework ขนาดใหญ่เพียงเพื่อสร้าง object ไม่กี่ตัว
- สร้าง interface ให้ทุก class แม้ไม่มี alternative implementation หรือ test boundary
- ย้ายทุก helper เข้า `shared/` จนกลายเป็น directory รวมของที่ไม่สัมพันธ์กัน
- ใช้ event bus ภายในทุก feature แทน function call ธรรมดา
- refactor ทุก featureพร้อมกันโดยไม่มี regression tests
- ทำ architecture เพื่อความสวยงามแต่เพิ่มขั้นตอนโดยไม่ลด coupling

## 16. แผนย้ายจาก FlowPocket ปัจจุบัน

โครงสร้างปัจจุบันเป็นแบบแยกตาม layer:

```text
src/routes/
src/controllers/
src/schemas/
src/entities/
src/plugins/
src/utils/
```

ไม่ควรย้ายทั้งหมดใน Pull Request เดียว แนะนำลำดับนี้:

### Phase 1: สร้าง safety net

1. เพิ่ม test runner และ `test:ci` script
2. เพิ่ม API tests สำหรับ authentication, ownership และ critical transaction flows
3. ทำให้ lint, build และ tests เป็น required CI checks

### Phase 2: แยก business logic ใน feature ที่มีการเปลี่ยนแปลง

1. เลือก feature หนึ่ง เช่น `transactions`
2. เพิ่ม `transaction.service.ts` โดยย้ายเฉพาะ business rules
3. เพิ่ม Repository เมื่อ query ซับซ้อนหรือจำเป็นต้อง inject `EntityManager`
4. รักษา route, status code และ response shape เดิม
5. เพิ่ม tests ก่อนย้าย feature ถัดไป

### Phase 3: รวมไฟล์ตาม feature

ย้าย Route, Controller, Service, Repository, Schema และ tests ของ feature ที่มี coverage แล้วเข้า `src/features/<feature>/`

ทำทีละ feature และหลีกเลี่ยงการเปลี่ยน behavior พร้อมกับการย้ายไฟล์ หากจำเป็นให้แยก structural refactor กับ behavior change เป็นคนละ commit หรือ Pull Request

### Phase 4: แยก infrastructure และ shared code

1. ย้าย database และ S3 integration ไป `infrastructure/`
2. แยก config validation
3. ย้ายเฉพาะ utilities ที่มีผู้ใช้ข้าม feature จริงไป `shared/`
4. ตรวจ dependency direction และลบ compatibility wrappers เมื่อไม่มีผู้ใช้แล้ว

## 17. Definition of Done สำหรับ Feature

- [ ] Route มี schema และ authentication hook ที่เหมาะสม
- [ ] Controller ไม่มี business/database logic ที่ควรอยู่ใน Service/Repository
- [ ] Service ตรวจ business rules และ ownership
- [ ] Repository scope user-owned data ด้วย `userId`
- [ ] Multiple writes ใช้ transaction เดียวกันเมื่อจำเป็น
- [ ] API ไม่ expose internal fields หรือ database errors
- [ ] Locale และ API docs อัปเดตเมื่อ contract เปลี่ยน
- [ ] Unit/integration/API tests ครอบ happy path และ failure ที่สำคัญ
- [ ] `npm run lint` และ `npm run build` ผ่าน
- [ ] Migration ผ่านการตรวจ up/down, existing data และ deployment order
- [ ] Final diff ไม่มี unrelated changes หรือ secrets
- [ ] มี logs/metrics เพียงพอสำหรับวิเคราะห์ failure ใน production

## 18. สรุปคำแนะนำสำหรับ FlowPocket

โครงสร้างเป้าหมายที่เหมาะสมคือ:

```text
Modular Monolith
└── Feature Modules
    └── Route -> Controller -> Service -> Repository -> PostgreSQL
```

ใช้ Fastify plugins เป็น composition และ encapsulation boundary ใช้ Service เป็น business/transaction boundary ใช้ Repository จำกัด database concerns และย้ายทีละ feature พร้อม tests ไม่จำเป็นต้องใช้ Clean Architecture เต็มรูปแบบหรือ microservices เพื่อให้พร้อม production

คุณภาพ production ไม่ได้มาจาก directory structure เพียงอย่างเดียว แต่ต้องมี automated tests, migrations, CI gates, observability, secure configuration, immutable deployment และ rollback ที่ทดสอบได้ร่วมกัน

## แหล่งอ้างอิง

- [Fastify Plugins](https://fastify.dev/docs/latest/Reference/Plugins/)
- [Fastify Encapsulation](https://fastify.dev/docs/latest/Reference/Encapsulation/)
- [Fastify Testing Guide](https://fastify.dev/docs/latest/Guides/Testing/)
- [TypeORM Migration Setup](https://typeorm.io/docs/migrations/setup/)
- [TypeORM Transactions](https://typeorm.io/docs/advanced-topics/transactions/)
- [Node.js Environment Variables](https://nodejs.org/api/environment_variables.html)
