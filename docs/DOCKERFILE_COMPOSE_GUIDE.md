# คู่มือ Dockerfile และ Docker Compose สำหรับ FlowPocket

เอกสารนี้อธิบายหน้าที่และการทำงานของไฟล์ต่อไปนี้:

- `Dockerfile` สำหรับสร้าง production application image
- `compose.dev.yaml` สำหรับ PostgreSQL ใน development
- `compose.prod.yaml` สำหรับ API, migration และ PostgreSQL ใน production-like environment

## ภาพรวมสถาปัตยกรรม

### Development

```text
Node.js application บนเครื่อง
        │
        │ localhost:5433
        ▼
PostgreSQL container
compose.dev.yaml
```

Development Compose เปิดเฉพาะ PostgreSQL ส่วน application รันบนเครื่องด้วย `npm run dev`

### Production

```text
Client
  │
  │ host port 8080
  ▼
app container
  │
  │ postgres:5432
  ▼
PostgreSQL container
  ▲
  │ รัน migration ก่อน app เริ่ม
migrate container
```

Production Compose ไม่ build source code บน server แต่ pull image `montonjm/flowpocket` ที่สร้างจาก `Dockerfile`

## 1. Dockerfile คืออะไร

`Dockerfile` คือชุดคำสั่งสำหรับสร้าง Docker image ของ application แต่ละคำสั่งสร้าง layer ที่สามารถ cache และนำกลับมาใช้ได้

FlowPocket ใช้ multi-stage build:

```text
builder stage
  ├── ติดตั้ง dependencies ทั้งหมด
  ├── copy TypeScript source
  └── compile เป็น dist/
            │
            ▼
runner stage
  ├── ติดตั้งเฉพาะ production dependencies
  ├── copy dist/ จาก builder
  ├── copy locale files
  └── เริ่ม node dist/index.js
```

ข้อดีคือ final image ไม่มี TypeScript source, compiler และ development dependencies ที่ไม่จำเป็นต่อ runtime

GitHub Actions ใช้ QEMU และ Docker Buildx สร้าง image จาก Dockerfile นี้สำหรับทั้ง `linux/amd64` และ `linux/arm64` เพื่อรองรับ x86 servers และเครื่อง Apple Silicon/ARM

## 2. อธิบาย Dockerfile ทีละส่วน

### Builder stage

```dockerfile
FROM node:24-alpine AS builder
```

- ใช้ Node.js 24 บน Alpine Linux
- ตั้งชื่อ stage ว่า `builder`
- stage นี้มีหน้าที่ compile TypeScript

```dockerfile
WORKDIR /app
```

กำหนด working directory ภายใน image เป็น `/app` คำสั่งถัดไปจะทำงานจาก directory นี้

```dockerfile
COPY package.json package-lock.json ./
RUN npm ci
```

- copy dependency manifests ก่อน source code
- `npm ci` ติดตั้งตาม `package-lock.json`
- Docker สามารถ reuse dependency layer เมื่อ source เปลี่ยนแต่ manifests ไม่เปลี่ยน

```dockerfile
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build
```

- copy TypeScript configs และ source
- รัน `tsc -p tsconfig.build.json`
- build output อยู่ที่ `/app/dist`

### Runner stage

```dockerfile
FROM node:24-alpine AS runner
```

เริ่ม stage ใหม่ ทำให้ไฟล์จาก builder ไม่เข้ามาใน final image โดยอัตโนมัติ

```dockerfile
WORKDIR /app
ENV NODE_ENV=production
```

- ใช้ `/app` เป็น working directory
- กำหนด runtime environment เป็น production

```dockerfile
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
```

- ติดตั้งเฉพาะ production dependencies
- ไม่ติดตั้ง packages ใน `devDependencies`
- ล้าง npm cache เพื่อลดขนาด image

TypeORM อยู่ใน `dependencies` ของโปรเจกต์ จึงมี CLI สำหรับ service `migrate` ใน production image

```dockerfile
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/locales ./src/locales
```

- copy compiled JavaScript จาก builder
- copy locale JSON ซึ่ง TypeScript compiler ไม่ได้นำเข้า `dist`

```dockerfile
EXPOSE 8080
```

บันทึกว่า container คาดว่าจะรับ traffic ที่ port `8080` แต่ไม่ได้เปิด port บน host การ publish port ทำใน Compose ด้วย `ports`

```dockerfile
CMD ["node", "dist/index.js"]
```

กำหนด default process เมื่อเริ่ม container ใช้ exec-form เพื่อให้ Node.js รับ signals จาก container runtime ได้โดยตรง

## 3. Build และตรวจ Docker image

Build local image:

```bash
docker build --tag flowpocket:local .
```

ตรวจ image:

```bash
docker image ls flowpocket
docker image inspect flowpocket:local
docker image history flowpocket:local
```

Build เฉพาะ builder stage สำหรับตรวจ compile environment:

```bash
docker build --target builder --tag flowpocket:builder .
```

Build โดยไม่ใช้ cacheเมื่อ debug ปัญหา layer:

```bash
docker build --no-cache --progress plain --tag flowpocket:local .
```

## 4. `.dockerignore`

Docker ส่ง build context ไปยัง builder ก่อนเริ่ม build `.dockerignore` ป้องกันไฟล์ที่ไม่จำเป็นหรือเป็นความลับไม่ให้เข้า context

FlowPocket ตัดไฟล์สำคัญ เช่น:

```text
.git
.env
.env.*
node_modules
dist
coverage
docs
```

แม้มี `.dockerignore` ก็ไม่ควรเก็บ secrets ไว้ใน source tree โดยไม่จำเป็น และห้ามส่ง secret ผ่าน Docker build arguments เพราะอาจปรากฏใน image history หรือ provenance

## 5. Environment variables ที่ต้องใช้

Application ต้องการอย่างน้อย:

```dotenv
APP_PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_USER=flowpocket
DB_PASSWORD=replace-with-a-strong-password
DB_NAME=flowpocket
SESSION_TOKEN_SECRET=replace-with-a-secret-at-least-32-characters-long
S3_ACCOUNT_ID=replace-me
S3_ACCESS_KEY_ID=replace-me
S3_SECRET_ACCESS_KEY=replace-me
S3_BUCKET_NAME=replace-me
S3_PUBLIC_URL=replace-me
```

`.env.example` ใช้ชื่อ `DB_*` และ `APP_PORT` ตรงกับ application แล้ว และมีตัวแปร host ports กับ `IMAGE_TAG` สำหรับ Compose แยกไว้ชัดเจน ก่อนใช้งานให้ copy เป็น `.env` และแทนค่าตัวอย่างทั้งหมด โดยเฉพาะ passwords, token secret และ S3 credentials

ห้าม commit `.env` จริงเข้า Git และควรใช้ secrets คนละชุดสำหรับ development, staging และ production

## 6. Compose variable substitution กับ container environment

Compose ใช้ environment สองช่วงที่ต่างกัน:

```text
ค่าใน shell / .env
    │
    ├── แทน ${VARIABLE} ตอนอ่าน Compose file
    │
    └── env_file/environment ส่งค่าเข้า container
```

ตัวอย่าง:

```yaml
ports:
  - "${APP_PORT:-8080}:8080"
```

`APP_PORT` ด้านซ้ายคือ host port ที่ Compose อ่าน ส่วน `8080` ด้านขวาคือ container port

```yaml
environment:
  APP_PORT: 8080
```

ค่านี้ถูกส่งเข้า application ภายใน container

ใน `compose.prod.yaml`, ค่าใต้ `environment` จะ override ค่าชื่อเดียวกันที่โหลดจาก `env_file: .env`

## 7. compose.dev.yaml

Development Compose มี service เดียว:

```yaml
services:
  postgres:
```

### PostgreSQL image

```yaml
image: postgres:16-alpine
container_name: flowpocket-postgres-dev
restart: unless-stopped
```

- ใช้ PostgreSQL 16 บน Alpine
- กำหนดชื่อ container เพื่อค้นหาได้ง่าย
- restart เมื่อ process ล้มเหลวหรือ Docker daemon restart ยกเว้นผู้ใช้สั่งหยุดเอง

### Database initialization

```yaml
environment:
  POSTGRES_USER: ${DB_USER}
  POSTGRES_PASSWORD: ${DB_PASSWORD}
  POSTGRES_DB: ${DB_NAME}
```

ตัวแปร `POSTGRES_*` เป็น interface ของ official PostgreSQL image ส่วนค่าด้านขวามาจากตัวแปร `DB_*` ของ FlowPocket

ค่า initialization มีผลเมื่อ data directory ว่างครั้งแรก หากเปลี่ยน username, password หรือ database หลัง volume ถูกสร้าง PostgreSQL จะไม่ initialize ใหม่อัตโนมัติ

### Port mapping

```yaml
ports:
  - "${POSTGRES_HOST_PORT:-5433}:5432"
```

- host port ค่าเริ่มต้น: `5433`
- container port: `5432`
- application ที่รันบนเครื่องใช้ `DB_HOST=localhost` และ `DB_PORT=5433`

เปลี่ยน host port ชั่วคราวได้:

```bash
POSTGRES_HOST_PORT=5435 docker compose -f compose.dev.yaml up --detach
```

### Development volume

```yaml
volumes:
  - postgres_dev_data:/var/lib/postgresql/data
```

named volume ทำให้ข้อมูลยังอยู่เมื่อ container ถูก replace หรือนำออกด้วย `docker compose down`

### Health check

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
  interval: 5s
  timeout: 5s
  retries: 10
  start_period: 5s
```

Docker เรียก `pg_isready` ทุก 5 วินาทีเพื่อตรวจว่า PostgreSQL พร้อมรับ connection

### เริ่ม development

```bash
docker compose -f compose.dev.yaml config
docker compose -f compose.dev.yaml up --detach
docker compose -f compose.dev.yaml ps
docker compose -f compose.dev.yaml logs --follow postgres
```

จากนั้นรัน application บน host:

```bash
npm run dev
```

หยุด Compose โดยเก็บ database:

```bash
docker compose -f compose.dev.yaml down
```

## 8. compose.prod.yaml

Production Compose มีสาม services:

```text
postgres → migrate → app
```

### app service

```yaml
image: montonjm/flowpocket:${IMAGE_TAG:-latest}
pull_policy: always
```

- ใช้ image จาก Docker Hub ไม่ build บน production server
- `IMAGE_TAG` กำหนด version ที่จะ deploy
- `pull_policy: always` ให้ Compose ตรวจ registry ก่อนเริ่ม app

Production ควรระบุ immutable tag:

```bash
IMAGE_TAG=sha-0123456789abcdef0123456789abcdef01234567 docker compose -f compose.prod.yaml up --detach
```

ไม่ควรพึ่ง `latest` เพราะตรวจสอบและ rollback version ได้ยาก

```yaml
env_file:
  - .env
environment:
  NODE_ENV: production
  APP_PORT: 8080
  DB_HOST: postgres
  DB_PORT: 5432
```

- โหลด application secrets จาก `.env`
- บังคับ runtime mode และ internal connection values
- `DB_HOST=postgres` ใช้ Compose service name เป็น DNS hostname
- ห้ามใช้ `localhost` เพื่อเชื่อม database จาก app container เพราะ `localhost` หมายถึง app container เอง

```yaml
ports:
  - "${APP_PORT:-8080}:8080"
```

เปิด API container port `8080` สู่ host port ที่กำหนดด้วย `APP_PORT`

```yaml
depends_on:
  postgres:
    condition: service_healthy
  migrate:
    condition: service_completed_successfully
```

app จะเริ่มเมื่อ PostgreSQL healthy และ migration จบสำเร็จเท่านั้น

### migrate service

`migrate` ใช้ application image เดียวกับ `app` เพื่อให้ migration code ตรงกับ application version:

```yaml
command:
  - node
  - ./node_modules/typeorm/cli.js
  - migration:run
  - -d
  - ./dist/datasource.js
```

คำสั่งนี้ override `CMD` จาก Dockerfile แล้วรัน TypeORM migrations จาก compiled datasource

```yaml
restart: "no"
```

migration เป็น one-shot process ต้องจบด้วย exit code `0` ไม่ควร restart วนเมื่อ migration ล้มเหลว

### postgres service

Production PostgreSQL ใช้ named volume แยกจาก development:

```yaml
volumes:
  - postgres_prod_data:/var/lib/postgresql/data
```

Admin port bind เฉพาะ loopback:

```yaml
ports:
  - "127.0.0.1:${POSTGRES_ADMIN_PORT:-5434}:5432"
```

จึงเชื่อมต่อได้จาก production host แต่ไม่เปิด PostgreSQL รับ traffic จากทุก network interface

การป้องกันนี้ไม่แทน firewall, authentication, TLS และ network policy ใน production จริง

## 9. ลำดับการเริ่ม production

ตรวจ config โดยระบุ image tag:

```bash
IMAGE_TAG=sha-0123456789abcdef0123456789abcdef01234567 docker compose -f compose.prod.yaml config
```

> `docker compose config` อาจแสดงค่าที่อ่านจาก `.env` อย่านำ output ที่มี secrets ไปเผยแพร่

Pull image:

```bash
IMAGE_TAG=sha-0123456789abcdef0123456789abcdef01234567 docker compose -f compose.prod.yaml pull
```

เริ่ม stack:

```bash
IMAGE_TAG=sha-0123456789abcdef0123456789abcdef01234567 docker compose -f compose.prod.yaml up --detach
```

ตรวจสถานะและ logs:

```bash
docker compose -f compose.prod.yaml ps --all
docker compose -f compose.prod.yaml logs migrate
docker compose -f compose.prod.yaml logs --follow --tail 100 app
```

สถานะที่คาดหวัง:

| Service | สถานะ |
| --- | --- |
| `postgres` | running และ healthy |
| `migrate` | exited ด้วย code `0` |
| `app` | running |

## 10. การ update และ rollback

### Update

```bash
IMAGE_TAG=sha-NEW_COMMIT_SHA docker compose -f compose.prod.yaml pull app migrate
IMAGE_TAG=sha-NEW_COMMIT_SHA docker compose -f compose.prod.yaml up --detach
```

ควรใช้ SHA จริงจาก CI และตรวจ migration compatibility ก่อน deploy

### Rollback application image

```bash
IMAGE_TAG=sha-PREVIOUS_COMMIT_SHA docker compose -f compose.prod.yaml pull app migrate
IMAGE_TAG=sha-PREVIOUS_COMMIT_SHA docker compose -f compose.prod.yaml up --detach
```

การ rollback image ไม่ได้ rollback database schema โดยอัตโนมัติ Migration จึงควรออกแบบให้ backward-compatible และต้องมีแผน restore/rollback database แยกต่างหาก

## 11. คำสั่งที่ใช้บ่อย

### Development

```bash
docker compose -f compose.dev.yaml up -d
docker compose -f compose.dev.yaml ps
docker compose -f compose.dev.yaml logs -f postgres
docker compose -f compose.dev.yaml down
```

### Production

```bash
docker compose -f compose.prod.yaml config
docker compose -f compose.prod.yaml pull
docker compose -f compose.prod.yaml up -d
docker compose -f compose.prod.yaml ps -a
docker compose -f compose.prod.yaml logs -f app
docker compose -f compose.prod.yaml down
```

`down` ปกติไม่ลบ named volumes ห้ามเติม `--volumes` ใน production เพราะจะลบ `postgres_prod_data`

## 12. Troubleshooting

### Application เชื่อม database ไม่ได้

ตรวจว่า:

- development host ใช้ `DB_HOST=localhost` และ host port เช่น `5433`
- app container ใช้ `DB_HOST=postgres` และ `DB_PORT=5432`
- ชื่อ `DB_*` ใน `.env` ถูกต้อง
- PostgreSQL health check ผ่าน

```bash
docker compose -f compose.prod.yaml ps --all
docker compose -f compose.prod.yaml logs postgres
docker compose -f compose.prod.yaml logs app
```

### Migration ล้มเหลว

```bash
docker compose -f compose.prod.yaml logs migrate
docker compose -f compose.prod.yaml logs postgres
```

อย่าแก้ `depends_on` เพื่อข้าม migration ควรแก้ migration หรือ configuration ให้สำเร็จก่อนเริ่ม app

### เปลี่ยน `.env` แล้วค่าไม่เปลี่ยน

สร้าง container ใหม่ด้วย:

```bash
docker compose -f compose.prod.yaml up --detach --force-recreate
```

ตรวจเฉพาะ environment ที่ไม่เป็นความลับ:

```bash
docker compose -f compose.prod.yaml exec app sh -c 'printf "NODE_ENV=%s\nAPP_PORT=%s\nDB_HOST=%s\nDB_PORT=%s\n" "$NODE_ENV" "$APP_PORT" "$DB_HOST" "$DB_PORT"'
```

### เปลี่ยน database credentials แล้ว login ไม่ได้

PostgreSQL initialization variables ไม่เปลี่ยน user/password ของ volume เดิมโดยอัตโนมัติ ต้องแก้ credential ภายใน PostgreSQL หรือสร้าง database ใหม่หลัง backup ข้อมูลแล้ว

## 13. ข้อจำกัดและงาน production ที่ควรเพิ่ม

โครงสร้างปัจจุบันใช้งาน production-like ได้ แต่ควรเพิ่มก่อนรับ traffic จริง:

- health endpoint เช่น `GET /health`
- Docker health check สำหรับ `app`
- รัน application ด้วย non-root user ใน Dockerfile
- pin base images ด้วย version/digest ตามนโยบาย supply chain
- container vulnerability scan
- CPU และ memory limits ตาม environment
- log collection และ monitoring
- database backup ที่ทดสอบ restore แล้ว
- managed secrets แทน `.env` บน host เมื่อ infrastructure รองรับ
- reverse proxy/load balancer และ HTTPS
- staging deployment และ smoke test ก่อน production

## Checklist

### Dockerfile

- [x] ใช้ multi-stage build
- [x] ใช้ `npm ci`
- [x] final image ติดตั้งเฉพาะ production dependencies
- [x] copy compiled output จาก builder
- [ ] ใช้ non-root user
- [ ] มี application health check
- [ ] pin base image ตามนโยบาย production

### Development Compose

- [x] ใช้ PostgreSQL แยกใน container
- [x] มี named volume
- [x] มี health check
- [x] เปลี่ยน host port ได้
- [x] `.env.example` ใช้ `DB_*` และ `APP_PORT` ตรงกับ application

### Production Compose

- [x] pull application image จาก registry
- [x] รองรับ immutable `IMAGE_TAG`
- [x] รอ PostgreSQL healthy
- [x] รัน migration ก่อน app
- [x] PostgreSQL admin port bind กับ `127.0.0.1`
- [x] แยก production volume จาก development
- [ ] มี app health check
- [ ] deploy ด้วย SHA/version แทน `latest`
- [ ] มี backup, monitoring และ rollback runbook

## เอกสารที่เกี่ยวข้อง

- [Useful Docker Commands](./DOCKER_COMMANDS.md)
- [Docker Hub: Build, Tag, Push และ Pull](./DOCKER_HUB_GUIDE.md)
- [คู่มือ CI](./CI_GUIDE.md)
