# คู่มือสร้าง Continuous Integration (CI) สำหรับ FlowPocket

คู่มือนี้อธิบาย CI ของ FlowPocket ด้วย GitHub Actions ตั้งแต่การเตรียมโปรเจกต์ การตรวจ Pull Request การ build Docker image การเผยแพร่ image ไป Docker Hub ไปจนถึงการป้องกัน branch แบบที่ใกล้เคียงระบบ production จริง

เนื้อหาอ้างอิงโครงสร้างปัจจุบันของ FlowPocket ซึ่งเป็น Node.js, TypeScript และ Docker โดยใช้ branch `main` เป็น branch หลัก

> CI มีหน้าที่ตรวจสอบและสร้าง artifact ส่วนการนำ artifact ไปติดตั้งบน staging หรือ production เป็น Continuous Delivery/Deployment (CD) ซึ่งควรแยก workflow และสิทธิ์ออกจาก CI

### สถานะปัจจุบันของ FlowPocket

ไฟล์ workflow ที่ใช้งานจริงคือ `.github/workflows/docker.yml` และมี job `build` เพียง job เดียว:

- Pull Request เข้า `main`: `npm ci`, lint, test type-check, automated tests, TypeScript build และ multi-platform Docker build โดยไม่ push image
- Push เข้า `main`: ทำ quality checks ชุดเดียวกัน แล้ว push `latest` และ `sha-${COMMIT_SHA}` ไป Docker Hub
- มี Docker layer cache เฉพาะขั้นตอน build-and-push ของ event `push`
- ตั้งค่า `DOCKERHUB_USERNAME` และ `DOCKERHUB_TOKEN` แล้ว และยืนยันการใช้งานจาก workflow ที่ push image สำเร็จ
- เปิด Ruleset `Protect main` และบังคับ Pull Request, required check `build`, branch up to date, conversation resolution รวมถึงป้องกัน force push และ branch deletion แล้ว
- มี unit tests ของ `GET /health` ด้วย `node:test` และ `Fastify.inject()` ครอบคลุมกรณี database พร้อมและล้มเหลว โดยไม่เชื่อม PostgreSQL จริง
- มี `npm run typecheck:test` สำหรับตรวจ TypeScript ของ `src/` และ `test/` โดยไม่ emit output และมี `npm run test:ci` สำหรับ CI
- ยังไม่มี integration tests ที่เชื่อม PostgreSQL จริง, dependency audit, container scan, SBOM, provenance หรือ deployment workflow
- `npm run build` เป็น TypeScript compilation check และสร้าง output ของ application ส่วน `npm run typecheck:test` ตรวจ type ของ test แยกต่างหาก

สถานะที่ตรวจสอบล่าสุดเมื่อ 22 สิงหาคม 2026:

- GitHub Actions run ล่าสุดจาก Pull Request คือ [run #15](https://github.com/alias-th/flowPocket/actions/runs/32549481811) และจบด้วย `success`
- GitHub Actions run ล่าสุดบน `main` คือ [run #13](https://github.com/alias-th/flowPocket/actions/runs/32495469892) สำหรับ commit `c26dfacd3ec489a2a02333109108cd5043f889c7` และจบด้วย `success`
- Docker Hub มี tag `latest` และ `sha-c26dfacd3ec489a2a02333109108cd5043f889c7` ซึ่งชี้ digest เดียวกัน และรองรับ `linux/amd64` กับ `linux/arm64`
- Ruleset [`Protect main`](https://github.com/alias-th/flowPocket/rules/21139308) มีสถานะ `active` และใช้กับ default branch
- local quality gate ที่มี lint, test type-check, automated tests 2 รายการ และ application build ผ่านแล้ว ส่วน GitHub Actions run ที่รวม test steps ต้องยืนยันอีกครั้งหลัง push การเปลี่ยนแปลงนี้

เมื่อ workflow จริงเปลี่ยน ต้องอัปเดตตัวอย่างและ checklist ในเอกสารนี้พร้อมกัน โดยให้ `.github/workflows/docker.yml` และ `package.json` เป็น source of truth สำหรับสิ่งที่ CI รันจริง

## เป้าหมายของระบบ

```text
Developer
    │
    ├── push feature branch
    │
    └── open Pull Request → main
            │
            ▼
       GitHub Actions CI
            ├── npm ci
            ├── lint
            ├── test type-check
            ├── automated tests
            ├── TypeScript build
            ├── Docker build
            └── security scan        (เป้าหมายถัดไป)
                    │
                    ▼
             review และ merge
                    │
                    ▼
             push เข้า main
                    │
                    ▼
       build และ push Docker image
            ├── latest
            └── sha-{COMMIT_SHA}
```

หลักสำคัญคือ Pull Request ต้องผ่านการตรวจทั้งหมดก่อน merge และ production ต้อง deploy ด้วย immutable tag เช่น `sha-{COMMIT_SHA}` หรือ version tag แทนการอ้าง `latest`

## 1. ทำความเข้าใจ CI และ CD

### Continuous Integration

CI ตรวจทุกการเปลี่ยนแปลงก่อนรวมเข้า branch หลัก ตัวอย่างงานใน CI ได้แก่:

- ติดตั้ง dependencies แบบ reproducible
- ตรวจ lint และรูปแบบโค้ด
- รัน unit/integration tests
- compile TypeScript
- build Docker image เพื่อพิสูจน์ว่า Dockerfile ใช้งานได้
- ตรวจ dependency และ container vulnerabilities

ถ้าขั้นตอนใดล้มเหลว Pull Request ต้องไม่สามารถ merge เข้า `main` ได้

### Continuous Delivery/Deployment

CD เริ่มหลัง CI ผ่านและสร้าง artifact แล้ว ตัวอย่างงานใน CD ได้แก่:

- deploy image ไป staging
- รัน database migration
- smoke test และ health check
- ขออนุมัติก่อน production
- deploy immutable image เดียวกับที่ผ่านการทดสอบ
- rollback เมื่อ deployment ไม่สำเร็จ

การแยก CI กับ CD ช่วยให้ workflow อ่านง่าย ลดสิทธิ์ของ CI และป้องกัน Pull Request ที่ไม่น่าเชื่อถือเข้าถึง production credentials

## 2. สิ่งที่ต้องมี

- GitHub repository ที่มี branch `main`
- สิทธิ์ Admin สำหรับตั้งค่า Actions, Secrets และ Ruleset
- `package-lock.json` ที่ commit อยู่ใน repository
- Dockerfile ที่ build สำเร็จ
- Docker Hub repository `montonjm/flowpocket`
- Docker Hub access token ที่มีสิทธิ์เขียน repository ดังกล่าว

ตรวจเครื่องมือในเครื่อง:

```bash
node --version
npm --version
docker --version
git --version
```

โปรเจกต์นี้ใช้ Node.js 24 ใน Dockerfile และ GitHub Actions จึงควรใช้ Node.js major version เดียวกันในเครื่องพัฒนาเพื่อลดความแตกต่างของ environment

## 3. เตรียมโปรเจกต์ให้พร้อมก่อนเขียน CI

### 3.1 ใช้ lockfile

ต้อง commit `package-lock.json` และใช้คำสั่งนี้ใน CI:

```bash
npm ci
```

`npm ci` ติดตั้ง dependency ตาม lockfile และจะล้มเหลวเมื่อ `package.json` กับ `package-lock.json` ไม่ตรงกัน จึงเหมาะกับระบบอัตโนมัติมากกว่า `npm install`

เมื่อแก้ dependencies ให้สร้าง lockfile ใหม่ในเครื่องและ commit ไปพร้อมกัน:

```bash
npm install --save-dev eslint
git add package.json package-lock.json
```

### 3.2 มีคำสั่งมาตรฐานใน `package.json`

ปัจจุบัน FlowPocket มีคำสั่ง lint, แก้ lint อัตโนมัติ, test, test type-check และ build:

```json
{
  "scripts": {
    "lint": "eslint src test --max-warnings=0",
    "lint:fix": "eslint src --fix",
    "test": "tsx --test test/*.test.ts",
    "test:ci": "tsx --test test/*.test.ts",
    "typecheck:test": "tsc -p tsconfig.test.json",
    "build": "tsc -p tsconfig.build.json"
  }
}
```

CI ตรวจ source และ tests ด้วยคำสั่ง:

```bash
npm run lint
npm run typecheck:test
npm run test:ci
npm run build
```

`npm run build` ตรวจและ compile เฉพาะ application ตาม `tsconfig.build.json` ส่วน `npm run typecheck:test` ใช้ `tsconfig.test.json` ตรวจ `src/**/*.ts` และ `test/**/*.ts` โดยไม่สร้างไฟล์ output ขณะที่ `npm run test:ci` รัน tests แบบไม่เข้า watch mode

ESLint ใช้ Flat Config ที่ `eslint.config.mjs` และตรวจไฟล์ `src/**/*.ts` กับ `test/**/*.ts` ด้วย recommended rules ของ ESLint และ typescript-eslint

### 3.3 ทดสอบ local quality gate

ก่อน push ควรรันอย่างน้อย:

```bash
npm ci
npm run lint
npm run typecheck:test
npm run test:ci
npm run build
docker build --tag flowpocket:local .
```

หากคำสั่งเหล่านี้ไม่ผ่านในเครื่อง ควรแก้ก่อน push แทนการใช้ CI เป็นเครื่องทดลองหลัก

### 3.4 ป้องกันไฟล์ที่ไม่ควรเข้า build context

`.dockerignore` ของโปรเจกต์ตัดข้อมูลสำคัญและไฟล์ที่ไม่จำเป็น เช่น:

```text
.git
.env
.env.*
node_modules
coverage
docs
```

อย่า `COPY . .` โดยไม่ตรวจ `.dockerignore` เพราะอาจส่ง secrets หรือไฟล์ขนาดใหญ่เข้า Docker build context

## 4. เตรียม Docker Hub

### 4.1 สร้าง repository

สร้าง Docker Hub repository ชื่อ:

```text
montonjm/flowpocket
```

ควรกำหนด visibility และสิทธิ์ให้เหมาะกับระบบ หากเป็น private repository เครื่อง staging และ production ต้องมี credential สำหรับ pull image

### 4.2 สร้าง access token

ใน Docker Hub ให้สร้าง access token สำหรับ CI โดยเฉพาะ และให้เฉพาะสิทธิ์ที่จำเป็นต่อการ push image

แนวทางด้านความปลอดภัย:

- ไม่ใช้รหัสผ่านบัญชีหลัก
- ไม่เก็บ token ใน `.env` ที่ commit เข้า Git
- ไม่เขียน token ลง workflow
- ตั้งชื่อ token ให้ทราบว่าใช้โดย GitHub Actions ของ repository ใด
- rotate และ revoke token เมื่อสงสัยว่ารั่วไหล

## 5. ตั้งค่า GitHub Variable และ Secret

ไปที่:

**Repository → Settings → Secrets and variables → Actions**

### Variables

สร้าง Repository variable:

| Name                 | Value      |
| -------------------- | ---------- |
| `DOCKERHUB_USERNAME` | `montonjm` |

Variable ใช้กับข้อมูลที่ไม่เป็นความลับและจะแสดงใน workflow ได้ผ่าน:

```yaml
${{ vars.DOCKERHUB_USERNAME }}
```

### Secrets

สร้าง Repository secret:

| Name              | Value                   |
| ----------------- | ----------------------- |
| `DOCKERHUB_TOKEN` | Docker Hub access token |

Secret ใช้ผ่าน:

```yaml
${{ secrets.DOCKERHUB_TOKEN }}
```

GitHub พยายาม mask secret ใน logs แต่ไม่ควรพิมพ์ secret ออกมาหรือส่งผ่าน command line โดยไม่จำเป็น

## 6. สร้าง workflow ขั้นพื้นฐาน

สร้างไฟล์ `.github/workflows/docker.yml`:

```yaml
name: Build and Push Docker Image

on:
  pull_request:
    branches:
      - main

  push:
    branches:
      - main

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest

    permissions:
      contents: read

    steps:
      - name: Checkout source code
        uses: actions/checkout@v6

      - name: Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Lint source code
        run: npm run lint

      - name: Type-check tests
        run: npm run typecheck:test

      - name: Run automated tests
        run: npm run test:ci

      - name: Build application
        run: npm run build

      - name: Setup QEMU
        uses: docker/setup-qemu-action@v3

      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        if: github.event_name == 'push'
        uses: docker/login-action@v4
        with:
          username: ${{ vars.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build Docker image for pull request
        if: github.event_name == 'pull_request'
        uses: docker/build-push-action@v6
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: false
          tags: montonjm/flowpocket:test

      - name: Build and push Docker image
        if: github.event_name == 'push'
        uses: docker/build-push-action@v6
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: |
            montonjm/flowpocket:latest
            montonjm/flowpocket:sha-${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

นี่คือ workflow ปัจจุบันของ FlowPocket ส่วนต่อไปจะอธิบายแต่ละส่วนและแนวทางยกระดับให้เหมาะกับ production หากไฟล์จริงกับตัวอย่างต่างกัน ให้ยึด `.github/workflows/docker.yml` เป็นหลักและอัปเดตเอกสารนี้

> Action major versions ในตัวอย่างสะท้อน workflow ณ เวลาที่อัปเดตเอกสาร ก่อนเปลี่ยน version ให้ตรวจ release notes และ runtime requirement ของ action จาก repository ทางการ แล้วทดสอบใน Pull Request

## 7. ทำความเข้าใจ workflow ทีละส่วน

### ชื่อ workflow

```yaml
name: Build and Push Docker Image
```

ชื่อนี้แสดงในหน้า **Actions** และช่วยระบุว่า workflow ทำอะไร

### Events

```yaml
on:
  pull_request:
    branches:
      - main
  push:
    branches:
      - main
```

- `pull_request` ตรวจโค้ดก่อน merge เข้า `main`
- `push` ทำงานหลัง merge หรือ push เข้า `main`

Pull Request build Docker image แต่ไม่ push ส่วน push เข้า `main` จะ login และเผยแพร่ image

ไม่ควรใช้ `pull_request_target` แทน `pull_request` โดยไม่เข้าใจผลด้านความปลอดภัย เพราะ event ดังกล่าวสามารถเข้าถึงบริบทและ secrets ของ base repository ได้

### Job ID และ required check

```yaml
jobs:
  build:
```

`build` คือ job ID และเป็นชื่อ status check ที่ใช้ใน Ruleset ของ `main` หากเปลี่ยน job ID ต้องตรวจและแก้ required status check ให้ตรงกัน

### Runner

```yaml
runs-on: ubuntu-latest
```

GitHub สร้าง runner ใหม่สำหรับแต่ละ job เมื่อ job จบ runner จะถูกทิ้ง จึงไม่ควรสมมติว่าไฟล์จาก run ก่อนหน้ายังคงอยู่

### สิทธิ์ของ `GITHUB_TOKEN`

```yaml
permissions:
  contents: read
```

Job นี้ต้องอ่าน repository เท่านั้น การกำหนด permission แบบ explicit ลดผลกระทบหาก action หรือ script ถูกโจมตี

### Checkout และ Node.js cache

```yaml
- uses: actions/checkout@v6
- uses: actions/setup-node@v6
  with:
    node-version: 24
    cache: npm
```

`checkout` นำ source code ลง runner ส่วน `setup-node` ติดตั้ง Node.js และ cache package downloads ของ npm โดย cache ไม่ใช่การเก็บ `node_modules`; ทุก run ยังต้องใช้ `npm ci`

### เงื่อนไขการ login

```yaml
if: github.event_name == 'push'
```

Docker Hub credentials ถูกใช้เฉพาะ event `push` ไม่ใช้ใน Pull Request วิธีนี้ลดพื้นที่ที่ secret ถูกเปิดเผยและ Pull Request จาก fork จะยัง build เพื่อตรวจสอบได้โดยไม่ต้องมี registry secret

### Mutable และ immutable tags

```yaml
tags: |
  montonjm/flowpocket:latest
  montonjm/flowpocket:sha-${{ github.sha }}
```

- `latest` เปลี่ยนชี้ไป image ใหม่ทุกครั้ง จึงสะดวกสำหรับการทดลองแต่ตรวจย้อนกลับยาก
- `sha-{COMMIT_SHA}` ผูก image กับ source commit ชัดเจน เหมาะสำหรับ deploy และ rollback

production ควรบันทึก digest หรือใช้ `sha-*`/version tag ที่ไม่ถูกเขียนทับ

### Docker layer cache

```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

BuildKit ใช้ GitHub Actions cache เพื่อลดเวลา build เมื่อ Docker layers ไม่เปลี่ยน Cache ช่วยด้านความเร็ว แต่ผลลัพธ์ต้องยังสร้างซ้ำได้แม้ไม่มี cache

## 8. การควบคุม workflow ด้วย concurrency

เมื่อ push เข้า Pull Request เดิมหลายครั้ง run เก่ามักไม่มีประโยชน์ FlowPocket จึงกำหนด `concurrency` หลัง `on` เพื่อยกเลิก run เก่า:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

ใช้ชื่อ workflow ร่วมกับ ref เพื่อไม่ให้ workflow อื่นที่บังเอิญใช้ concurrency group เดียวกันถูกยกเลิก

สำหรับ deployment production ไม่ควรใช้รูปแบบเดียวกันโดยอัตโนมัติ เพราะการยกเลิกกลาง deployment อาจทำให้ระบบอยู่ในสถานะไม่สมบูรณ์ ควรใช้ deployment-specific concurrency ที่รอเป็นคิว

## 9. Quality gates และ automated tests

FlowPocket ใช้ `node:test` ผ่าน `tsx` และ `Fastify.inject()` สำหรับ unit tests ปัจจุบัน พร้อมตรวจ type ของ tests แยกจาก application build ลำดับ quality steps คือ:

```yaml
- name: Lint source code
  run: npm run lint

- name: Type-check tests
  run: npm run typecheck:test

- name: Run automated tests
  run: npm run test:ci

- name: Build application
  run: npm run build
```

test ชุดแรกครอบคลุม `GET /health` เมื่อ database query สำเร็จและล้มเหลวโดยใช้ database mock จึงรันได้โดยไม่ต้องมี PostgreSQL หรือ `.env` ขั้นตอนถัดไปด้าน testing คือเพิ่ม unit tests ของ business rules และ integration tests ที่เชื่อม test database จริง

หลักของ test command ใน CI:

- ต้องไม่เข้า watch mode
- ต้องคืน exit code `1` เมื่อ test ล้มเหลว
- ไม่พึ่ง `.env` ของนักพัฒนา
- ใช้ test database แยกต่างหากหากเป็น integration test
- ต้องควบคุมเวลาและข้อมูลทดสอบให้ผลลัพธ์ทำซ้ำได้

หาก tests ต้องใช้ PostgreSQL สามารถเพิ่ม service container:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: flowpocket_test
    ports:
      - 5432:5432
    options: >-
      --health-cmd "pg_isready -U test -d flowpocket_test"
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

ใช้ PostgreSQL major version เดียวกับ `compose.prod.yaml` เพื่อลดความต่างของ environment และใช้ credentials สำหรับ test เท่านั้น ห้ามใช้ production database หรือ production secrets ใน CI tests

## 10. แยก jobs สำหรับ quality และ Docker

เมื่อมี lint และ tests แล้ว ควรแยกความรับผิดชอบเพื่ออ่านผลได้ง่าย:

```yaml
jobs:
  quality:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck:test
      - run: npm run test:ci
      - run: npm run build

  docker:
    needs: quality
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      # checkout, Buildx, login ตาม event และ build/push image
```

ข้อดี:

- Docker build จะไม่เริ่มเมื่อ quality checks ล้มเหลว
- Ruleset สามารถบังคับ checks `quality` และ `docker` แยกกัน
- logs และเวลาที่ใช้ของแต่ละหน้าที่ชัดเจนขึ้น

ข้อแลกเปลี่ยนคือแต่ละ job ใช้ runner ใหม่ หากต้องส่ง build output ระหว่าง jobs ต้องใช้ artifact หรือสร้างใหม่อย่างตั้งใจ

## 11. เพิ่ม security gates

production CI ควรมีอย่างน้อยสามชั้น

### Dependency audit

ตัวอย่าง baseline:

```yaml
- name: Audit production dependencies
  run: npm audit --omit=dev --audit-level=high
```

ต้องกำหนดนโยบายว่า severity ใดทำให้ pipeline ล้มเหลว และมีขั้นตอนจัดการ exception ไม่ควรปิด audit แบบถาวรเพราะมี false positive เพียงรายการเดียว

### Container vulnerability scan

build image แล้วใช้ scanner ที่องค์กรเลือกตรวจ OS packages และ application dependencies โดยควร:

- pin scanner action ด้วย full commit SHA
- fail เมื่อพบ vulnerability ตาม severity policy
- ระบุวิธีบันทึกและอนุมัติ exception
- scan image เดียวกับที่จะเผยแพร่ ไม่ใช่ Dockerfile อย่างเดียว

### Secret scanning และ dependency updates

เปิด GitHub secret scanning, push protection และ Dependabot หาก plan และ repository รองรับ เพื่อช่วยตรวจ credential ที่เผลอ commit และเสนอ dependency updates

security scan เป็น quality gate ไม่ใช่การรับประกันว่า image ปลอดภัยทั้งหมด จึงยังต้อง patch base image และ dependencies อย่างต่อเนื่อง

## 12. Harden GitHub Actions สำหรับ production

### Pin actions ด้วย full commit SHA

tag เช่น `@v6` อ่านง่ายแต่เจ้าของ action สามารถเลื่อน tag ได้ production ควรเปลี่ยนเป็น commit SHA ที่ตรวจสอบแล้ว:

```yaml
- name: Checkout source code
  uses: actions/checkout@FULL_40_CHARACTER_COMMIT_SHA # v6
```

ทำเช่นเดียวกันกับทุก third-party action และให้ Dependabot หรือ Renovate เสนอ PR อัปเดต SHA พร้อมตรวจ release notes ห้ามคัดลอก SHA จากแหล่งที่ไม่น่าเชื่อถือ

### ใช้ least privilege

กำหนด `permissions` ที่ workflow หรือ job ทุกครั้ง ค่าเริ่มต้นสำหรับ CI นี้คือ:

```yaml
permissions:
  contents: read
```

เพิ่ม `packages: write`, `id-token: write` หรือสิทธิ์อื่นเฉพาะ job ที่จำเป็นจริงเท่านั้น Docker Hub login ด้วย token ของ Docker Hub ไม่ต้องใช้ `packages: write`

### จำกัด actions ที่อนุญาต

ไปที่ **Settings → Actions → General** แล้วพิจารณาอนุญาตเฉพาะ GitHub-owned, verified creators และ actions ที่ระบุไว้ตามนโยบายของทีม

### อย่าส่ง secrets เป็น Docker build arguments

ค่าใน build arguments อาจปรากฏใน image history หรือ provenance หาก build ต้องใช้ secret ให้ใช้ BuildKit secret mounts และตรวจว่า secret ไม่ถูก copy เข้า layer

### ระวังโค้ดจาก Pull Request

- อย่านำชื่อ branch, title หรือ body ของ Pull Request ไปประกอบ shell command โดยตรง
- อย่าใช้ secrets ใน workflow ที่รันโค้ดจาก fork
- อย่า checkout และรันโค้ดที่ไม่น่าเชื่อถือด้วย `pull_request_target`
- ตรวจ workflow changes อย่างเข้มงวด เพราะ workflow สามารถเข้าถึง credentials ได้

## 13. Image metadata, SBOM และ provenance

เมื่อระบบโตขึ้น ควรใช้ `docker/metadata-action` เพื่อสร้าง tags และ OCI labels อย่างสม่ำเสมอ เช่น source repository, revision และ version

สำหรับ image ที่ push ไป registry สามารถเพิ่ม:

```yaml
with:
  push: true
  sbom: true
  provenance: mode=max
```

- SBOM แสดงส่วนประกอบซอฟต์แวร์ใน image
- provenance บันทึกข้อมูลว่าผลลัพธ์ถูก build อย่างไรและจาก source ใด

ห้ามส่ง secret ผ่าน Docker build arguments เพราะข้อมูล build arguments อาจรวมอยู่ใน provenance

## 14. ตั้ง Ruleset ให้ CI เป็นประตูเข้า `main`

CI จะป้องกัน `main` ได้จริงเมื่อ Ruleset บังคับ status checks

ค่าที่แนะนำ:

- Target branch: `main` หรือ default branch
- Require a pull request before merging
- Require status checks to pass
- Required check: `build` สำหรับ workflow ปัจจุบัน
- Require branches to be up to date before merging
- Block force pushes
- Restrict deletions
- Require conversation resolution before merging
- Required approvals: `0` เมื่อทำคนเดียว หรืออย่างน้อย `1` เมื่อมีทีม

ดูขั้นตอนละเอียดใน [BRANCH_PROTECTION_RULESET.md](./BRANCH_PROTECTION_RULESET.md)

หลังแยก jobs เป็น `quality` และ `docker` ต้องอัปเดต required checks ให้ตรงกับ job IDs ใหม่ ระวังอย่าใช้ job ID ซ้ำในหลาย workflows เพราะอาจทำให้ required check กำกวม

## 15. Workflow การพัฒนาประจำวัน

สร้าง feature branch จาก `main` ล่าสุด:

```bash
git switch main
git pull --ff-only origin main
git switch -c feature/add-health-check
```

พัฒนาและทดสอบในเครื่อง:

```bash
npm ci
npm run lint
npm run typecheck:test
npm run test:ci
npm run build
docker build --tag flowpocket:local .
```

commit และ push:

```bash
git add src package.json package-lock.json
git commit -m "feat: add health check endpoint"
git push -u origin feature/add-health-check
```

จากนั้น:

1. เปิด Pull Request เข้า `main`
2. รอ required checks ผ่าน
3. แก้ผล review และ push commits เพิ่มใน branch เดิม
4. อัปเดต branch เมื่อ GitHub แจ้งว่าไม่ทัน `main`
5. merge เมื่อ checks, reviews และ conversations ผ่านทั้งหมด
6. ตรวจ workflow จาก event `push` ว่าสร้างและ push image สำเร็จ
7. จด image tag `sha-{COMMIT_SHA}` เพื่อใช้ในขั้นตอน deploy

## 16. ทดสอบ pipeline ตั้งแต่ต้นจนจบ

### ทดสอบ Pull Request path

ตรวจว่า:

- workflow เริ่มเมื่อเปิด PR เข้า `main`
- `npm ci`, `npm run lint`, `npm run typecheck:test`, `npm run test:ci` และ `npm run build` ผ่าน
- Docker image build ผ่านแต่ไม่ถูก push ไป Docker Hub
- workflow ไม่พยายามอ่าน `DOCKERHUB_TOKEN`
- Ruleset ป้องกัน merge เมื่อ check ล้มเหลว

ทดลองทำให้ TypeScript compile ไม่ผ่านใน branch ชั่วคราว แล้วตรวจว่า PR ถูก block จากนั้นแก้โค้ดและตรวจว่า run ใหม่ผ่าน

### ทดสอบ main path

หลัง merge ตรวจว่า:

- workflow เริ่มจาก event `push`
- login Docker Hub สำเร็จ
- มี `montonjm/flowpocket:latest`
- มี `montonjm/flowpocket:sha-{MERGE_COMMIT_SHA}`
- image สามารถ pull และเริ่มทำงานได้

ตัวอย่างตรวจ image แบบ immutable:

```bash
docker pull montonjm/flowpocket:sha-0123456789abcdef0123456789abcdef01234567
docker image inspect montonjm/flowpocket:sha-0123456789abcdef0123456789abcdef01234567
```

อย่าทดสอบ production readiness ด้วยการดูว่า workflow เป็นสีเขียวอย่างเดียว FlowPocket มี `GET /health` และ Docker health check แล้ว ขั้นตอนถัดไปคือเพิ่ม automated smoke test หลัง deployment

## 17. การออก version และ release

เมื่อต้องการ release แบบเป็นทางการ ให้กำหนดนโยบาย SemVer เช่น:

```text
v1.0.0
v1.1.0
v2.0.0
```

แนวทางที่ปลอดภัย:

1. PR ผ่าน CI และ merge เข้า `main`
2. เลือก commit ที่ผ่าน CI
3. สร้าง protected tag `vX.Y.Z` ชี้ commit นั้น
4. build หรือ promote image โดยรักษาความสัมพันธ์กับ commit SHA
5. deploy staging และ production ด้วย version หรือ digest ที่ immutable

หลีกเลี่ยงการแก้ tag เดิมให้ชี้ image ใหม่ เพราะทำให้ audit และ rollback ไม่น่าเชื่อถือ

## 18. แยก CD ออกจาก CI

หลัง CI สมบูรณ์ ควรสร้าง workflow สำหรับ deployment แยก เช่น:

```text
.github/workflows/
├── ci.yml
├── publish-image.yml
└── deploy.yml
```

ตัวอย่างขอบเขต:

- `ci.yml`: lint, tests, compile และ Docker build บน PR
- `publish-image.yml`: push immutable image หลัง merge/tag
- `deploy.yml`: deploy image ที่ระบุไป staging/production

ใช้ GitHub Environments ชื่อ `staging` และ `production` เพื่อแยก secrets, approval และ deployment history Production deployment ควรมี manual approval อย่างน้อยในช่วงเริ่มต้น

หลักสำคัญคือ deploy image ที่ผ่าน CI แล้ว ไม่ build source ใหม่บน production server

## 19. Troubleshooting

### Workflow ไม่ทำงาน

ตรวจว่า:

- workflow อยู่ใต้ `.github/workflows/`
- YAML ถูกต้อง
- Pull Request มี base branch เป็น `main`
- GitHub Actions เปิดใช้งานใน repository
- organization policy อนุญาต actions ที่เรียกใช้

### `npm ci` ล้มเหลว

สาเหตุที่พบบ่อย:

- `package.json` และ `package-lock.json` ไม่ตรงกัน
- Node.js version ต่างจากที่ใช้สร้าง lockfile
- package registry ใช้งานไม่ได้ชั่วคราว
- private package ไม่มี authentication

แก้ dependencies ในเครื่องด้วย Node.js version ที่กำหนด แล้ว commit lockfile ที่เปลี่ยน อย่าเปลี่ยน CI เป็น `npm install` เพื่อซ่อนปัญหา

### Docker login ล้มเหลว

ตรวจชื่อ:

- Variable: `DOCKERHUB_USERNAME`
- Secret: `DOCKERHUB_TOKEN`
- token ยังไม่หมดอายุหรือถูก revoke
- token มีสิทธิ์ push `montonjm/flowpocket`

อย่าแสดง token ใน logs เพื่อ debug

### PR build พยายาม push image

ตรวจ `if` และ `push`:

```yaml
if: github.event_name == 'push'
```

และ PR build ต้องใช้:

```yaml
push: false
```

### Required check ค้างหรือหาไม่พบ

- ให้ job ทำงานสำเร็จอย่างน้อยหนึ่งครั้งก่อนเลือกใน Ruleset
- ตรวจ job ID ว่ายังเป็น `build`
- ตรวจว่า workflow trigger ครอบคลุม Pull Request เข้า `main`
- ตรวจว่าไม่มี job ชื่อเดียวกันในหลาย workflows
- เมื่อ rename job ให้อัปเดต Ruleset ด้วย

### Docker build ผ่านในเครื่องแต่ล้มใน CI

ตรวจความต่างของ:

- CPU architecture
- filename ตัวพิมพ์เล็ก/ใหญ่
- ไฟล์ที่ถูกตัดด้วย `.dockerignore`
- environment variables ที่เครื่อง local มีแต่ CI ไม่มี
- uncommitted files ที่ Dockerfile ใช้ในเครื่องแต่ไม่มีใน repository

### Cache ทำให้สับสน

ลอง build โดยไม่พึ่ง cache เพื่อแยกสาเหตุ Cache ต้องช่วยให้เร็วขึ้นเท่านั้น ไม่ควรเป็นเงื่อนไขให้ build สำเร็จ

## 20. Production readiness checklist

### Source และ dependencies

- [x] commit `package-lock.json`
- [x] ใช้ `npm ci`
- [x] กำหนด Node.js major version ตรงกับ Dockerfile
- [x] มี lint script และเรียกใช้ใน workflow
- [x] มี automated tests ของ health endpoint และ local test ผ่าน
- [x] มี test type-check และเรียกใช้ใน workflow
- [x] มี TypeScript build script และเรียกใช้ใน workflow

### Docker

- [x] Dockerfile เป็น multi-stage build
- [x] `.dockerignore` ตัด secrets และไฟล์ไม่จำเป็น
- [x] PR build image แต่ไม่ push
- [x] `main` push image แบบ `sha-*`
- [ ] production deploy ด้วย immutable tag หรือ digest
- [ ] มี container vulnerability scan
- [ ] มี SBOM และ provenance ตามนโยบายทีม

### GitHub Actions security

- [x] กำหนด `permissions` แบบ least privilege
- [x] secrets อยู่ใน GitHub Secrets
- [x] secrets ไม่ถูกส่งเข้า PR jobs โดยไม่จำเป็น
- [ ] actions ถูก pin ด้วย full commit SHA
- [ ] จำกัด actions ที่ repository อนุญาต
- [ ] เปิด dependency และ secret scanning ตามความสามารถของ repository
- [x] มี concurrency ที่เหมาะกับ CI

### Repository governance

- [x] เปิด Ruleset สำหรับ `main`
- [x] บังคับ Pull Request
- [x] บังคับ required status check `build`
- [x] บังคับ branch up to date
- [x] ป้องกัน force push และ branch deletion
- [x] กำหนด required approvals เป็น `0` สำหรับการพัฒนาคนเดียว และบังคับ conversation resolution

### Operations

- [ ] แยก CI, image publishing และ deployment
- [ ] แยก staging กับ production secrets
- [x] มี health endpoint และ Docker health check
- [ ] มี automated smoke test หลัง deployment
- [ ] มี deployment approval สำหรับ production
- [ ] มี rollback ด้วย image SHA ก่อนหน้า
- [ ] มีการแจ้งเตือนเมื่อ pipeline หรือ deployment ล้มเหลว

## ลำดับการพัฒนาจากสถานะปัจจุบัน

FlowPocket มี baseline ต่อไปนี้แล้ว:

- `npm ci`
- ESLint สำหรับ `src/` และ `test/` ด้วย `npm run lint`
- test type-check ด้วย `npm run typecheck:test`
- automated tests ด้วย `node:test` ผ่าน `npm run test:ci`
- TypeScript build
- Docker build บน Pull Request
- Docker Hub login เฉพาะ push เข้า `main`
- push tags `latest` และ `sha-*`
- GitHub Actions cache สำหรับ Docker layers ใน main push path
- workflow concurrency เพื่อยกเลิก run เก่าของ ref เดิม

ลำดับที่แนะนำให้ทำต่อ:

1. เพิ่ม unit tests ของ business rules และ integration tests ที่เชื่อม PostgreSQL test database
2. ยืนยัน GitHub Actions run ที่มี test steps ว่าผ่านหลัง push การเปลี่ยนแปลง
3. แยก `quality` กับ `docker` jobs เพื่อให้ผลแต่ละหน้าที่ชัดเจน
4. เพิ่ม dependency และ container security scan
5. pin actions ทุกตัวด้วย full commit SHA
6. เพิ่ม image metadata, SBOM และ provenance
7. เพิ่ม automated smoke test ที่เรียก `GET /health` หลัง deployment
8. แยก publish/deploy workflows และสร้าง GitHub Environments
9. deploy production ด้วย `sha-*` หรือ digest ไม่ใช้ `latest`

## เอกสารอ้างอิง

- [GitHub Actions documentation](https://docs.github.com/en/actions)
- [GitHub Actions secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)
- [Control workflow concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
- [Dependency caching](https://docs.github.com/en/actions/concepts/workflows-and-actions/dependency-caching)
- [actions/checkout](https://github.com/actions/checkout)
- [actions/setup-node](https://github.com/actions/setup-node)
- [docker/login-action](https://github.com/docker/login-action)
- [docker/build-push-action](https://github.com/docker/build-push-action)
- [Docker Build GitHub Actions](https://docs.docker.com/build/ci/github-actions/)
- [Docker: Add SBOM and provenance attestations](https://docs.docker.com/build/ci/github-actions/attestations/)
- [คู่มือตั้ง Branch Protection Ruleset](./BRANCH_PROTECTION_RULESET.md)
- [Useful Docker Commands สำหรับ FlowPocket](./DOCKER_COMMANDS.md)
- [คู่มือ Docker Hub: Build, Tag, Push และ Pull](./DOCKER_HUB_GUIDE.md)
- [คู่มือ Dockerfile และ Docker Compose](./DOCKERFILE_COMPOSE_GUIDE.md)
- [Useful Git Commands สำหรับ FlowPocket](./GIT_COMMANDS.md)
