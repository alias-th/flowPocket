# คู่มือใช้ Codex ให้มีประสิทธิภาพสำหรับ FlowPocket

คู่มือนี้อธิบายวิธีสั่งงาน Codex ให้ได้ผลลัพธ์ที่แม่นยำ ตรวจสอบง่าย และปลอดภัย โดยใช้ FlowPocket ซึ่งเป็น Backend API ด้วย Node.js, TypeScript, Fastify, TypeORM และ PostgreSQL เป็นตัวอย่าง

แนวคิดหลักคือ **บอกเป้าหมาย ขอบเขต ข้อจำกัด และเกณฑ์ว่างานสำเร็จ** ไม่จำเป็นต้องกำกับทุกคำสั่งที่ Codex ต้องรัน เพราะ Codex สามารถสำรวจโค้ด เลือกไฟล์ แก้ไข และตรวจสอบงานภายในขอบเขตที่กำหนดได้

## 1. Prompt ที่ดีควรมีอะไรบ้าง

ใช้โครงสร้างนี้เป็นค่าเริ่มต้น:

```text
Goal: ต้องการผลลัพธ์อะไร
Context: ข้อมูลทางธุรกิจหรือไฟล์ที่เกี่ยวข้อง
Scope: อนุญาตให้แก้ส่วนใด
Constraints: สิ่งที่ต้องรักษาหรือห้ามทำ
Acceptance criteria: เงื่อนไขที่ใช้ตัดสินว่างานเสร็จ
Verification: ต้องตรวจด้วยคำสั่งหรือกรณีทดสอบใด
Output: ต้องการให้สรุปผลอย่างไร
```

ตัวอย่าง:

```text
เพิ่ม endpoint สำหรับดู monthly expense summary ของ account ที่ login อยู่

Context:
- ใช้ architecture Route -> Controller -> Service -> TypeORM
- รูปแบบ response ให้อิงจาก summary endpoint ที่มีอยู่

Scope:
- แก้เฉพาะ summary feature และ tests ที่เกี่ยวข้อง

Constraints:
- ตรวจ ownership ของ account
- รับ month เป็น YYYY-MM และ validate input
- ห้ามเพิ่ม dependency
- ถ้าต้องเปลี่ยน public API หรือ database schema ให้หยุดถามก่อน

Acceptance criteria:
- รวมเฉพาะ expense ของผู้ใช้และเดือนที่ระบุ
- เดือนที่ไม่มีรายการคืน total เป็น 0
- unauthorized access ถูกปฏิเสธตาม error pattern เดิม

Verification:
- รัน lint, build และ relevant tests
- ตรวจ final diff ว่าไม่มี unrelated changes

สรุปเป็นภาษาไทย พร้อมไฟล์ที่แก้ ผลการตรวจ และความเสี่ยงที่เหลือ
```

Prompt ไม่ต้องยาวเสมอไป งานเล็กอาจเขียนเพียง:

```text
แก้ TypeScript error ใน src/services/transaction.service.ts เท่านั้น
หาสาเหตุก่อน แก้ให้น้อยที่สุด ห้ามเปลี่ยน public API แล้วรัน lint และ build
```

## 2. ระบุชนิดของงานให้ชัด

คำกริยาต่างกันทำให้ขอบเขตการทำงานต่างกัน:

| คำสั่ง | สิ่งที่คาดหวัง |
| --- | --- |
| `อธิบาย` | อ่านและอธิบาย ไม่แก้ไฟล์ |
| `วิเคราะห์` / `diagnose` | หาสาเหตุและแสดงหลักฐาน ยังไม่แก้ เว้นแต่สั่งเพิ่ม |
| `review` | รายงาน bug, risk หรือ regression โดยอ้างไฟล์และบรรทัด |
| `วางแผน` | เสนอขั้นตอนและไฟล์ที่เกี่ยวข้อง ยังไม่ implement |
| `แก้` / `implement` / `สร้าง` | แก้ไฟล์ใน scope และตรวจสอบผล |

ตัวอย่างที่คลุมเครือ:

```text
ดู authentication ให้หน่อย
```

ตัวอย่างที่ตรวจสอบได้:

```text
review authentication flow ตั้งแต่ route ถึง refresh-token persistence
เน้น authorization bypass, token leakage และ race condition
ห้ามแก้ไฟล์ รายงาน findings เรียงตาม severity พร้อม file:line และวิธีแก้
```

## 3. ให้ Codex สำรวจของเดิมก่อนแก้

สำหรับงานที่ไม่เล็ก ควรสั่งให้ Codex:

1. อ่าน `AGENTS.md` และคำสั่งที่มีผลกับ directory นั้น
2. หา implementation และ pattern ที่ใกล้เคียง
3. ระบุไฟล์ที่ได้รับผลกระทบ
4. แก้เฉพาะส่วนที่จำเป็น
5. รัน verification ที่เกี่ยวข้อง
6. ตรวจ final diff และ unrelated changes

ตัวอย่าง:

```text
เพิ่ม CRUD สำหรับ categories โดยสำรวจ feature ที่ใกล้เคียงก่อน
ทำตาม architecture และ error handling เดิม รักษา strict types และตรวจ ownership ทุก operation
อย่า refactor ส่วนอื่น หลังแก้ให้รัน verification ที่โปรเจกต์รองรับและตรวจ final diff
```

การบอกให้ "ทำตาม pattern เดิม" มีประโยชน์กว่าการเดาโครงสร้างใหม่จากชื่อเทคโนโลยีเพียงอย่างเดียว

## 4. ใช้ `AGENTS.md` สำหรับกติกาที่ต้องใช้ซ้ำ

`AGENTS.md` เหมาะกับข้อมูลถาวรระดับ repository เช่น:

- architecture และขอบเขตความรับผิดชอบแต่ละ layer
- coding conventions
- security requirements
- คำสั่ง lint, typecheck และ test
- รูปแบบสรุปผล

อย่าใส่ requirement เฉพาะ ticket หรือคำสั่งชั่วคราวลง `AGENTS.md`; ให้ใส่ใน prompt ของงานนั้นแทน กฎที่ซ้ำกันหลายจุดอาจขัดแย้งกันและเปลือง context

สำหรับ FlowPocket กฎสำคัญที่ Codex จะได้รับจาก `AGENTS.md` อยู่แล้ว ได้แก่:

- architecture ปัจจุบันคือ `Route -> Controller -> TypeORM DataSource / Repository -> PostgreSQL`
- ให้เพิ่ม Service เมื่อ business logic ซับซ้อน ใช้ซ้ำ หรือควรมี transaction boundary ที่ทดสอบแยกได้
- validate external input และตรวจ resource ownership
- schema change ต้องใช้ migration
- ห้าม expose secrets, password hash และ internal database errors
- verification ปัจจุบันคือ `npm run lint` และ `npm run build`
- สรุปและอธิบายเหตุผลเป็นภาษาไทย

ดังนั้น prompt รายงานงานไม่ต้องคัดลอกกฎเหล่านี้ทั้งหมดซ้ำ เว้นแต่ต้องการเน้นความเสี่ยงเฉพาะงาน

### 4.1 ถ้าเริ่มโปรเจกต์ใหม่ ควรเขียน `AGENTS.md` อย่างไร

เริ่มด้วยไฟล์ `AGENTS.md` ที่ root ของ repository และเขียนเฉพาะข้อมูลที่เป็นจริงในตอนนั้น `AGENTS.md` รุ่นแรกไม่ควรเป็นเอกสาร architecture ในอุดมคติหรือรายการกฎขนาดใหญ่ เพราะ Codex อาจทำตามสิ่งที่ยังไม่ได้มีอยู่จริง

หลักสำคัญคือ:

- เขียนกฎที่ต้องใช้กับเกือบทุกงานใน repository
- ใช้ชื่อไฟล์ directory และ command ที่มีอยู่จริง
- บอก source of truth เมื่อเอกสารหลายชุดอาจขัดกัน
- ระบุขอบเขต security และการกระทำที่ต้องขออนุมัติ
- กำหนดวิธีตรวจว่างานเสร็จด้วยคำสั่งที่รันได้จริง
- ไม่คัดลอก style rules ที่ formatter, linter หรือ type checker บังคับให้อยู่แล้ว เว้นแต่ Codex จำเป็นต้องรู้ command
- ปรับเพิ่มเมื่อพบความผิดพลาดซ้ำหรือ review comment ที่เกิดซ้ำ ไม่ต้องพยายามเขียนทุกกรณีตั้งแต่วันแรก

#### ขั้นที่ 1: สร้างโปรเจกต์ให้มีโครงขั้นต่ำก่อน

ก่อนเขียน `AGENTS.md` ควรมีอย่างน้อย:

- `README.md` ที่บอกว่าโปรเจกต์ทำอะไร
- package/build configuration เช่น `package.json`, `pyproject.toml` หรือ `go.mod`
- source directory ที่ตั้งใจใช้
- commands สำหรับ build, lint และ test เท่าที่มีจริง
- `.env.example` ถ้าต้องใช้ environment variables โดยไม่มี secret จริง

ถ้ายังไม่มี test runner ให้เขียนว่า "ยังไม่มี automated tests" แทนการใส่ command ที่ยังรันไม่ได้

#### ขั้นที่ 2: ใส่ข้อมูลขั้นต่ำที่ Codex ต้องรู้

`AGENTS.md` รุ่นแรกควรตอบคำถามเหล่านี้:

1. โปรเจกต์นี้ทำอะไรและใช้ stack ใด
2. source code, tests, migrations และ docs อยู่ที่ไหน
3. request หรือ data flow เดินอย่างไร
4. coding conventions ใดที่เครื่องมือตรวจไม่ได้
5. มี security หรือ data invariants อะไรที่ห้ามละเมิด
6. ต้องใช้ command ใดเพื่อตรวจงาน
7. การเปลี่ยนแปลงประเภทใดต้องถามก่อน
8. ต้องการให้ Codex สรุปผลแบบใด

#### ขั้นที่ 3: ใช้ template เริ่มต้น

คัดลอก template นี้ไปไว้ที่ `AGENTS.md` แล้วแทนค่าภายในวงเล็บ ให้ลบ section ที่ยังไม่มีข้อมูลจริงออก:

````markdown
# Project Overview

[PROJECT_NAME] is [one or two sentences describing the product and users].

Core features:

- [FEATURE_1]
- [FEATURE_2]

# Tech Stack

- [LANGUAGE_AND_RUNTIME]
- [FRAMEWORK]
- [DATABASE_OR_STORAGE]
- [BUILD_AND_DEPLOYMENT_TOOLS]

# Source Map

- `[SOURCE_PATH]`: [responsibility]
- `[TEST_PATH]`: [test types]
- `[DOCS_PATH]`: [documentation purpose]
- `[MIGRATION_PATH]`: [schema migration purpose]

# Architecture

The current application flow is:

```text
[ENTRY_POINT] -> [APPLICATION_LAYER] -> [DATA_LAYER]
```

- [Responsibility of each layer]
- Follow existing feature patterns before introducing a new abstraction.
- Do not refactor unrelated modules as part of a feature change.

# Coding Rules

- Follow the conventions in nearby files.
- Keep types strict; do not use `any` unless the project explicitly permits it.
- Reuse existing utilities before adding abstractions.
- Do not add dependencies unless the task requires them.
- Do not edit generated files directly.

# Security and Data Rules

- Validate all external input.
- Verify authorization and ownership for protected resources.
- Never expose or log secrets, credentials, tokens, or sensitive personal data.
- Use the project's migration mechanism for schema changes.
- [DOMAIN_SPECIFIC_INVARIANT]

# Verification

After changing source code, run:

```bash
[LINT_COMMAND]
[TYPECHECK_OR_BUILD_COMMAND]
[TEST_COMMAND]
```

- Confirm each command exists before running it.
- Inspect the final diff and check for unrelated changes.
- Report commands not run, failures, and missing coverage accurately.

# Agent Workflow

- Inspect relevant existing code before a non-trivial change.
- Make the smallest coherent change that satisfies the request.
- Preserve unrelated user changes.
- Ask before destructive actions, external writes, dependency additions, deployment,
  or ambiguous changes to architecture, schema, security, or public APIs.

# Communication

- [LANGUAGE_AND_SUMMARY_PREFERENCE]
- Summarize changed files, verification results, risks, and assumptions.
````

#### ขั้นที่ 4: ตรวจว่าคำสั่งในไฟล์ใช้ได้จริง

อย่าเดาชื่อ scripts จาก convention เช่น อย่าเขียน `npm test` เพียงเพราะเป็น Node.js project ให้ตรวจจาก `package.json` แล้วทดลองรันใน local environment

ตัวอย่าง checklist:

```text
- command มีอยู่ใน configuration จริงหรือไม่
- command ทำงานแบบ non-interactive หรือไม่
- test command จบเองและคืน exit code ที่ CI ใช้ได้หรือไม่
- ต้องใช้ database, Docker หรือ environment variables หรือไม่
- command เปลี่ยนข้อมูลภายนอกหรือ shared environment หรือไม่
```

ถ้า integration tests ต้องใช้ PostgreSQL ให้บอกวิธีเตรียม test database และห้ามใช้ production credentials อย่างชัดเจน

#### ขั้นที่ 5: แยกคำสั่งตาม directory เมื่อโปรเจกต์โตขึ้น

เมื่อ repository มีหลายแอปหรือหลายภาษา ไม่ควรรวมทุกอย่างไว้ใน root file ตัวอย่าง:

```text
AGENTS.md                    # กฎร่วมทั้ง repository
apps/api/AGENTS.md           # กฎและ commands สำหรับ Backend
apps/web/AGENTS.md           # กฎและ commands สำหรับ Frontend
infra/AGENTS.override.md     # ข้อจำกัดเฉพาะ Infrastructure
```

Codex โหลดคำสั่งจาก project root ไล่ลงมาถึง working directory และไฟล์ที่อยู่ใกล้ directory ที่กำลังทำงานกว่าจะมีผลทีหลัง จึงใช้ nested `AGENTS.md` สำหรับกฎเฉพาะพื้นที่ และใช้ `AGENTS.override.md` เมื่อต้องการแทนคำสั่งใน directory นั้น

ควรวางกฎไว้ใกล้ code ที่กฎนั้นควบคุม เช่น migration rules ของ service ใด service หนึ่งควรอยู่ใน directory ของ service นั้น ไม่ควรเพิ่มรายละเอียดเฉพาะ service ทั้งหมดลง root file

#### ตัวอย่าง: ใส่ `AGENTS.md` ไว้ใน feature

การวาง `AGENTS.md` ระดับ feature เหมาะเมื่อ code ของ feature นั้นอยู่ใต้ directory เดียวกัน และมีกฎเฉพาะที่ไม่ควรบังคับ feature อื่น เช่น payment, authentication, reporting หรือ infrastructure

ตัวอย่าง repository แบบ feature-based:

```text
AGENTS.md
src/
├── features/
│   ├── accounts/
│   │   ├── controller.ts
│   │   ├── service.ts
│   │   └── schema.ts
│   └── transactions/
│       ├── AGENTS.md
│       ├── controller.ts
│       ├── service.ts
│       ├── repository.ts
│       └── transaction.test.ts
└── shared/
```

เมื่อ Codex ทำงานใน `src/features/transactions/` จะได้รับกฎจาก root `AGENTS.md` ก่อน แล้วตามด้วย `src/features/transactions/AGENTS.md` กฎของ feature จึงควรเขียนเฉพาะส่วนที่เพิ่มจาก root หรือเจาะจงกว่าเดิม ไม่ต้องคัดลอกกฎร่วมทั้ง repository มาซ้ำ

ตัวอย่าง `src/features/transactions/AGENTS.md`:

```markdown
# Transactions Feature

This feature creates and queries user-owned income and expense records.

## Invariants

- Every transaction belongs to an authenticated user and an active account.
- Scope every read and write by `userId`; a transaction UUID alone is not authorization.
- An optional category must belong to the same user and match the transaction type.
- Store monetary values as decimal strings. Do not calculate persisted amounts with
  JavaScript floating-point arithmetic.
- Treat `transactionDate` as an instant and preserve `Asia/Bangkok` report boundaries.

## Architecture

- Keep HTTP parsing and response formatting in `controller.ts`.
- Keep business rules and transaction orchestration in `service.ts`.
- Keep database queries in `repository.ts`.
- Do not import Fastify request or reply types into the service or repository.

## Changes

- Preserve the existing API response shape unless the task explicitly changes it.
- Add a migration for schema changes; never enable TypeORM `synchronize`.
- Update transaction API documentation when request or response contracts change.
- Ask before changing rounding rules, transaction types, or account-balance behavior.

## Verification

Run commands from the repository root:

```bash
npm run lint
npm run build
npm run test:ci -- transactions
```

- Confirm the scripts and feature-test filter exist before using them.
- Cover ownership, invalid category type, decimal precision, and date boundaries.
```

ตัวอย่างนี้เพิ่มเฉพาะ domain invariants และ layer rules ของ transaction feature ส่วนกฎทั่วไป เช่นห้าม commit secrets, รักษา unrelated changes และรูปแบบการสรุปผลควรอยู่ใน root `AGENTS.md`

##### ใช้ `AGENTS.override.md` เมื่อใด

ถ้า feature ต้อง **แทนที่** กฎของ directory เดียวกัน ให้ใช้ `AGENTS.override.md` เช่น payment service ต้องใช้คำสั่ง integration test เฉพาะและห้ามใช้ test command ทั่วไป:

```text
services/payments/
├── AGENTS.override.md
├── src/
└── tests/
```

```markdown
# Payments Override

- Run `make test-payments` instead of the repository-wide test command.
- Never call a real payment provider from tests.
- Use the sandbox adapter and test credentials only.
- Ask before changing idempotency or retry behavior.
```

ใน directory เดียวกัน Codex เลือก `AGENTS.override.md` ก่อน `AGENTS.md` และโหลดไม่เกินหนึ่ง instruction file ต่อ directory จึงไม่ควรสร้างทั้งสองไฟล์แล้วคาดว่าจะถูกนำมารวมกัน

##### ข้อควรระวังสำหรับโครงสร้าง FlowPocket ปัจจุบัน

FlowPocket ปัจจุบันจัดไฟล์ตาม layer ไม่ได้รวมทุกส่วนไว้ใต้ feature เดียว:

```text
src/
├── routes/transaction.ts
├── controllers/transaction.ts
├── schemas/transaction.schema.ts
└── entities/transaction.entity.ts
```

ถ้าวาง `src/controllers/AGENTS.md` กฎนั้นจะใช้กับ controller ทุกตัวใต้ `src/controllers/` แต่จะไม่ครอบคลุม `src/routes/transaction.ts`, `src/schemas/transaction.schema.ts` หรือ `src/entities/transaction.entity.ts` เพราะไฟล์เหล่านั้นไม่ได้อยู่ใน subtree เดียวกัน

สำหรับ FlowPocket มีทางเลือกที่เหมาะสมสองแบบ:

1. เก็บ transaction invariants ที่ใช้ข้ามหลาย layer ไว้ใน root `AGENTS.md` จนกว่าจะมีเหตุผลทาง architecture ให้เปลี่ยนโครงสร้าง
2. ถ้าในอนาคตย้ายไป feature-based structure จริง ค่อยสร้าง `src/features/transactions/AGENTS.md` พร้อมกับ feature directory

อย่าย้ายโครงสร้างทั้ง feature เพียงเพื่อให้วาง `AGENTS.md` ได้ และอย่าสร้าง `AGENTS.md` ซ้ำใน `routes/`, `controllers/`, `schemas/` และ `entities/` ด้วยเนื้อหาเดียวกัน เพราะกฎจะดูแลยากและมีโอกาสไม่ตรงกัน

หลังเพิ่ม feature guidance ให้ตรวจจาก working directory ของ feature:

```bash
codex --cd src/features/transactions --ask-for-approval never \
  "List the active instruction files and summarize transaction-specific rules."
```

ผลที่คาดหวังคือ Codex รายงานทั้ง root `AGENTS.md` และ feature `AGENTS.md` ตามลำดับ ถ้ารายงานเฉพาะ root file ให้ตรวจตำแหน่งไฟล์ ชื่อไฟล์ และเริ่ม session ใหม่

#### ขั้นที่ 6: ทดสอบว่า Codex อ่านกฎถูกชุด

หลังสร้างหรือย้ายไฟล์ ให้เริ่ม Codex session ใหม่แล้วขอให้สรุป instruction sources:

```bash
codex --ask-for-approval never "Summarize the current instructions."
```

เมื่อตรวจ nested directory:

```bash
codex --cd apps/api --ask-for-approval never \
  "Show which instruction files are active."
```

ตรวจว่าผลลัพธ์กล่าวถึง root rules และ nested rules ตามที่ตั้งใจ หากเพิ่งแก้ `AGENTS.md` ใน TUI session ที่เปิดค้างอยู่ ให้เริ่ม session ใหม่เพื่อโหลด instruction chain ใหม่

#### สิ่งที่ไม่ควรใส่ใน `AGENTS.md`

- requirement เฉพาะ ticket หรือ feature ครั้งเดียว
- รายละเอียดที่ค้นจาก source code ได้ง่ายและไม่ช่วยนำทาง
- token, password, API key หรือข้อมูลลับ
- command ที่ยังไม่มีหรือไม่เคยตรวจว่ารันได้
- architecture ที่ต้องการในอนาคตแต่ยังไม่ได้ตัดสินใจใช้
- กฎเดียวกันที่คัดลอกซ้ำหลาย section
- คำสั่งขัดกับ CI, formatter, linter หรือเอกสารหลักของทีม
- กฎส่วนบุคคลที่ไม่ควรบังคับทั้งทีม; กฎเหล่านี้เหมาะกับ global guidance มากกว่า

#### วิธีดูแลหลังเริ่มพัฒนา

ให้มอง `AGENTS.md` เป็น feedback loop:

1. Codex หรือ reviewer ทำพลาดซ้ำ
2. หาสาเหตุว่าเป็นกฎของ repository จริงหรือไม่
3. เพิ่มกฎสั้น ๆ พร้อม safe path ที่ควรทำ
4. เพิ่ม automation ใน linter, tests หรือ CI ถ้าตรวจด้วยเครื่องมือได้
5. ลบหรือแก้กฎเมื่อ architecture และ commands เปลี่ยน

ตัวอย่าง กฎที่ชัดกว่าคำว่า "ระวัง security":

```text
ทุก query ของ resource ที่ผู้ใช้เป็นเจ้าของต้อง filter ด้วย authenticated userId
ห้าม query ด้วย resource id เพียงอย่างเดียว
```

กฎแบบนี้บอกทั้งสิ่งที่ต้องตรวจและแนวทางที่ปลอดภัย จึงนำไปใช้และ review ได้จริง

## 5. กำหนดขอบเขตการแก้และการขออนุมัติ

บอกสิ่งที่ Codex ทำต่อได้ทันทีและสิ่งที่ต้องถามก่อน โดยเฉพาะงานที่มีผลต่อข้อมูลหรือระบบภายนอก:

```text
แก้ local source และ tests ที่เกี่ยวข้องได้ทันที
ถามก่อนเพิ่ม dependency, เปลี่ยน schema, เปลี่ยน public API, ลบข้อมูล,
รัน migration กับ shared database หรือ push/merge/deploy
```

สำหรับงาน database ควรระบุเพิ่ม:

```text
ออกแบบ migration ให้รองรับ rollback
วิเคราะห์ lock/downtime และ concurrent writes
ห้ามรัน migration กับ database ภายนอก
```

## 6. กำหนดหลักฐานว่าเสร็จจริง

อย่าจบ requirement แค่ "ทำให้ใช้ได้" ให้กำหนดผลที่พิสูจน์ได้ เช่น:

- test cases ที่ต้องผ่าน
- status code และ response shape
- authorization scenarios
- edge cases เช่น empty result, timezone, duplicate request และ concurrent update
- migration up/down behavior
- lint และ TypeScript compilation

ตัวอย่างสำหรับ bug fix:

```text
แก้ปัญหาการสร้าง transaction ซ้ำเมื่อ client retry request
เพิ่ม regression test ที่ fail ก่อน fix และ pass หลัง fix
อธิบาย root cause และ concurrency behavior
ห้ามแก้ response shape เดิม
```

### Verification ของ FlowPocket ปัจจุบัน

ก่อนสั่ง verification ให้ตรวจ scripts จริงใน `package.json` ด้วย ปัจจุบันมี:

```bash
npm run lint
npm run build
```

แม้ `AGENTS.md` จะกล่าวถึง `npm run typecheck` และ `npm test` แต่ `package.json` ยังไม่มี scripts สองรายการนี้ จึงควรให้ Codex รายงานว่าไม่ได้รันเพราะคำสั่งยังไม่มี แทนการกล่าวว่าตรวจผ่านแล้ว

Prompt ที่เหมาะกับสถานะปัจจุบัน:

```text
รัน npm run lint และ npm run build
รัน relevant tests ถ้ามี test command จริงใน package.json
ถ้าคำสั่งที่ AGENTS.md ระบุยังไม่มี ให้รายงานเป็น verification gap และอย่าสร้าง script ปลอม
```

## 7. แบ่งงานใหญ่เป็นช่วงที่ review ได้

งานที่มีผลต่อ architecture, database, security หรือ public API ควรแบ่งเป็นช่วง:

1. สำรวจและเสนอทางเลือก
2. ตกลง contract หรือ schema
3. implement ส่วนเล็กที่ครบวงจร
4. ทดสอบและ review diff
5. ทำ migration หรือ rollout plan

ตัวอย่างเริ่มต้น:

```text
วิเคราะห์การเพิ่ม recurring transactions โดยยังไม่แก้โค้ด
เสนอ 2 ทางเลือกด้าน schema และ scheduling พร้อม trade-offs,
affected files, migration risk และ API contract ที่แนะนำ
```

เมื่อเลือกแนวทางแล้วจึงสั่ง:

```text
ใช้ทางเลือกที่ 1 ตามแผนล่าสุด Implement เฉพาะ schema migration,
entity และ service tests ก่อน ยังไม่เพิ่ม scheduler หรือ route
```

วิธีนี้ช่วยให้ตรวจ decision สำคัญก่อนเกิดการเปลี่ยนแปลงขนาดใหญ่

## 8. ใช้ thread ให้เหมาะกับ context

ใช้ thread เดิมเมื่อ:

- เป็นงานเดียวกันและต้องอ้าง decision ก่อนหน้า
- กำลังแก้ผลจาก test หรือ review รอบก่อน
- ต้องการให้ Codex จำ scope และ acceptance criteria เดิม

เริ่ม thread ใหม่เมื่อ:

- เปลี่ยน feature หรือเป้าหมายอย่างชัดเจน
- context เดิมยาวและมีคำสั่งเก่าที่ไม่เกี่ยวข้อง
- ต้องการ review แบบเป็นกลางโดยไม่อิงเหตุผลของผู้ implement

เมื่อกลับมาทำงานต่อ ให้สรุป state สั้น ๆ:

```text
ทำงานต่อจาก implementation ปัจจุบัน เป้าหมายยังเหมือนเดิม
ตอนนี้ lint ผ่าน แต่ build fail ที่ transaction.service.ts:84
แก้เฉพาะ root cause แล้วรัน verification ซ้ำ
```

## 9. ให้ Codex ทำงานเป็นรอบ feedback

ผลลัพธ์ดีขึ้นเมื่อใช้วงจร:

```text
Inspect -> Implement -> Verify -> Review diff -> Refine
```

Prompt ที่ใช้ตรวจงานหลัง implement:

```text
review uncommitted diff ปัจจุบันเหมือน reviewer ที่ไม่ได้เขียนโค้ดนี้
หา correctness bug, security regression, missing validation และ missing tests
รายงาน findings ก่อน summary และห้ามแก้ไฟล์
```

จากนั้นจึงเลือก finding ที่ต้องแก้:

```text
แก้ findings ระดับ high และ medium ทั้งหมด
รักษา scope เดิม รัน verification ซ้ำ และสรุปสิ่งที่ยังไม่ได้แก้พร้อมเหตุผล
```

## 10. ตัวอย่าง Prompt สำหรับงานประจำ

### ทำความเข้าใจ codebase

```text
อธิบาย request flow ของ POST /transactions ตั้งแต่ route ถึง database
ระบุ validation, authentication, authorization, transaction boundary และ error handling
อ้าง file:line และชี้จุดที่ควรอ่านต่อ ห้ามแก้ไฟล์
```

### แก้ bug

```text
diagnose สาเหตุที่ GET /summary คืนยอดผิดเมื่อ timezone เป็น Asia/Bangkok
สร้าง reproduction หรือ test เพื่อยืนยันก่อน จากนั้นแก้ให้น้อยที่สุด
ห้ามเปลี่ยน API contract รัน lint, build และ relevant tests แล้วตรวจ diff
```

### เพิ่ม feature

```text
เพิ่ม export transactions เป็น CSV ตาม docs/API.md
สำรวจ export pattern และ authorization เดิมก่อน
validate date range, ป้องกัน formula injection และไม่โหลดข้อมูลทั้งหมดเข้าหน่วยความจำ
เพิ่ม tests สำหรับ ownership, empty result และ special characters
ถามก่อนถ้าต้องเปลี่ยน public API หรือเพิ่ม dependency
```

### Review code

```text
review diff เทียบกับ main โดยเน้น correctness และ security
ตรวจ ownership, input validation, leaked secrets, database transaction และ N+1 query
รายงานเฉพาะ findings ที่แก้ไขได้ เรียงตาม severity พร้อม file:line
ถ้าไม่พบให้บอกตรง ๆ พร้อม residual risks และ tests ที่ยังขาด ห้ามแก้ไฟล์
```

### ออกแบบ migration

```text
วางแผนเพิ่ม unique constraint สำหรับ category name ต่อ user โดยยังไม่แก้ไฟล์
ตรวจข้อมูลซ้ำเดิม, concurrent writes, lock risk, rollback และ deployment order
เสนอ SQL/TypeORM migration outline และคำถามที่ต้องตัดสินใจก่อน implement
```

### สร้างเอกสาร

```text
อัปเดต docs/API.md ให้ตรงกับ routes และ schemas ปัจจุบัน
ใช้ source code เป็น source of truth แก้เฉพาะเอกสาร
ระบุ endpoint ที่ contract ยังคลุมเครือแทนการเดา
```

## 11. Anti-pattern ที่ควรหลีกเลี่ยง

### Prompt กว้างเกินไป

```text
ทำระบบ transaction ให้ดีขึ้น
```

ปัญหา: ไม่มี scope, success criteria หรือความหมายของคำว่า "ดีขึ้น"

### สั่งขั้นตอนละเอียดเกินจำเป็น

```text
เปิดไฟล์ A แล้วค้นคำ B แล้วเพิ่ม method C ที่บรรทัด D ...
```

ปัญหา: อาจบังคับวิธีที่ไม่ตรงกับ codebase ปัจจุบัน ควรบอก outcome และ constraints แล้วให้ Codex สำรวจ implementation จริง

### รวมหลายเป้าหมายที่ไม่เกี่ยวกัน

```text
แก้ auth, refactor transaction, เพิ่ม CI และเขียน deployment guide
```

ปัญหา: review ยากและมีโอกาสเกิด unrelated changes ควรแยกเป็นงานหรือ thread

### ไม่มี acceptance criteria

```text
แก้ summary ให้ถูก
```

ปัญหา: ไม่ชัดว่า "ถูก" ครอบคลุม timezone, transaction type, account ownership และ empty data อย่างไร

### เชื่อคำว่าเสร็จโดยไม่ดูหลักฐาน

ควรอ่าน summary, ผล command, tests ที่ไม่ได้รัน, assumptions และ final diff เสมอ โดยเฉพาะงานเกี่ยวกับ authentication, authorization, migration และเงินจริง

## 12. Checklist ก่อนส่ง Prompt

- [ ] ระบุ outcome ที่ต้องการ
- [ ] ระบุไฟล์, feature หรือ endpoint ที่อยู่ใน scope
- [ ] บอกข้อห้ามหรือ compatibility ที่ต้องรักษา
- [ ] ระบุ security และ ownership behavior ที่สำคัญ
- [ ] เขียน acceptance criteria ที่ตรวจได้
- [ ] บอก verification ที่ต้องรัน
- [ ] ระบุการเปลี่ยนแปลงที่ต้องถามก่อน
- [ ] ขอให้ตรวจ final diff และ unrelated changes
- [ ] ระบุรูปแบบ summary หากต้องการแบบเฉพาะ

## 13. Prompt Template สำหรับคัดลอก

```text
เป้าหมาย:
[ผลลัพธ์ที่ต้องการ]

Context:
- [business rule หรือไฟล์อ้างอิง]
- [behavior ปัจจุบัน]

Scope:
- แก้ได้: [features/files]
- ห้ามแก้: [out-of-scope]

Constraints:
- ทำตาม AGENTS.md และ pattern เดิมของโปรเจกต์
- [security/API/database constraints]
- ถ้าพบ ambiguity ที่กระทบ architecture, schema, security หรือ public API ให้ถามก่อน

Acceptance criteria:
- [observable behavior 1]
- [observable behavior 2]
- [error/edge case]

Verification:
- รัน lint, build และ relevant tests ที่มีอยู่จริง
- ตรวจ final diff และ unrelated changes
- หากรันบางอย่างไม่ได้ ให้ระบุ command, สาเหตุ และผลกระทบ

ผลลัพธ์ที่ต้องการ:
- สรุปภาษาไทย
- รายชื่อไฟล์ที่แก้
- ผล verification
- risks และ assumptions ที่เหลือ
```

## สรุปสั้นที่สุด

Prompt ที่มีประสิทธิภาพไม่ใช่ prompt ที่ยาวที่สุด แต่เป็น prompt ที่ทำให้ Codex ตอบคำถามเหล่านี้ได้ชัดเจน:

1. ต้องสร้างผลลัพธ์อะไร
2. ใช้ context และ pattern ใด
3. แก้ได้แค่ไหนและห้ามทำอะไร
4. อะไรคือหลักฐานว่างานเสร็จ
5. การเปลี่ยนแปลงใดต้องให้ผู้ใช้ตัดสินใจก่อน

## แหล่งอ้างอิง

- [OpenAI Model guidance: Prompting best practices](https://developers.openai.com/api/docs/guides/latest-model#prompting-best-practices)
- [OpenAI Codex customization](https://developers.openai.com/codex/concepts/customization)
- [OpenAI Docs: Custom instructions with AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- [OpenAI Codex use cases](https://developers.openai.com/codex/use-cases)
