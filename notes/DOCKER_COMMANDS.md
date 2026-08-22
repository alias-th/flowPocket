# Useful Docker Commands สำหรับ FlowPocket

เอกสารนี้รวบรวมคำสั่ง Docker และ Docker Compose ที่ใช้บ่อยกับ FlowPocket สำหรับ development, production, debugging และการดูแล PostgreSQL

> ใช้คำสั่ง `docker compose` ซึ่งเป็น Compose V2 แทนคำสั่งเก่า `docker-compose`

## ไฟล์และ services ของโปรเจกต์

| Environment | Compose file | Services |
| --- | --- | --- |
| Development | `compose.dev.yaml` | `postgres` |
| Production | `compose.prod.yaml` | `app`, `migrate`, `postgres` |

ชื่อ containers ที่กำหนดไว้:

| Container | ชื่อ |
| --- | --- |
| Development PostgreSQL | `flowpocket-postgres-dev` |
| Production API | `flowpocket-api-prod` |
| Production migration | `flowpocket-migrate-prod` |
| Production PostgreSQL | `flowpocket-postgres-prod` |

ให้รันคำสั่งจาก directory รากของโปรเจกต์ ซึ่งเป็นตำแหน่งที่มี Compose files และ `.env`

## 1. ตรวจสอบ Docker

ดูเวอร์ชัน Docker และ Compose:

```bash
docker --version
docker compose version
```

ตรวจว่า Docker Engine ทำงานอยู่:

```bash
docker info
```

ดู containers ที่กำลังทำงาน:

```bash
docker ps
```

ดูทุก container รวมตัวที่หยุดแล้ว:

```bash
docker ps --all
```

## 2. Development PostgreSQL

### เริ่ม database

```bash
docker compose -f compose.dev.yaml up --detach
```

Development PostgreSQL เปิด port บนเครื่องผ่าน `${POSTGRES_HOST_PORT:-5433}` ค่าเริ่มต้นจึงเชื่อมต่อได้ที่:

```text
Host: localhost
Port: 5433
```

### ดูสถานะ

```bash
docker compose -f compose.dev.yaml ps
```

### ดู logs

```bash
docker compose -f compose.dev.yaml logs postgres
```

ติดตาม logs แบบต่อเนื่อง:

```bash
docker compose -f compose.dev.yaml logs --follow postgres
```

แสดงเฉพาะ 100 บรรทัดล่าสุด:

```bash
docker compose -f compose.dev.yaml logs --tail 100 postgres
```

กด `Ctrl+C` เพื่อหยุดติดตาม logs โดย container จะยังทำงานต่อ

### ตรวจ health check

```bash
docker inspect --format '{{json .State.Health}}' flowpocket-postgres-dev
```

ตรวจด้วย `pg_isready` ภายใน container:

```bash
docker compose -f compose.dev.yaml exec postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

### เปิด PostgreSQL CLI

```bash
docker compose -f compose.dev.yaml exec postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

คำสั่งพื้นฐานภายใน `psql`:

```text
\l          แสดง databases
\dt         แสดง tables
\d users    แสดงโครงสร้าง table users
\q          ออกจาก psql
```

### หยุด database

```bash
docker compose -f compose.dev.yaml stop
```

### เริ่ม container ที่เคยหยุด

```bash
docker compose -f compose.dev.yaml start
```

### หยุดและนำ container/network ออก

```bash
docker compose -f compose.dev.yaml down
```

คำสั่ง `down` ปกติจะยังเก็บ named volume `postgres_dev_data` ไว้ ข้อมูล database จึงไม่หาย

## 3. Build application image ในเครื่อง

Build image จาก `Dockerfile`:

```bash
docker build --tag flowpocket:local .
```

Build ใหม่โดยไม่ใช้ layer cache:

```bash
docker build --no-cache --tag flowpocket:local .
```

แสดงรายละเอียด build แบบ plain text:

```bash
docker build --progress plain --tag flowpocket:local .
```

ดู image ที่สร้าง:

```bash
docker image ls flowpocket
```

ดูรายละเอียด image:

```bash
docker image inspect flowpocket:local
```

ดู layers และ commands ที่ใช้สร้าง image:

```bash
docker image history flowpocket:local
```

ลบ local image:

```bash
docker image rm flowpocket:local
```

ต้องหยุดและลบ container ที่อ้าง image นี้ก่อน จึงจะลบ image ได้

## 4. Production Compose

Production Compose ใช้ image:

```text
montonjm/flowpocket:${IMAGE_TAG:-latest}
```

สำหรับ production จริงควรใช้ immutable tag เช่น `sha-{COMMIT_SHA}` แทน `latest`

ตัวอย่างในเอกสารใช้ SHA สมมติ ให้เปลี่ยนเป็น tag ที่มีอยู่จริงบน Docker Hub

### ตรวจ config ก่อนเริ่ม

```bash
IMAGE_TAG=sha-0123456789abcdef0123456789abcdef01234567 docker compose -f compose.prod.yaml config
```

คำสั่งนี้ช่วยตรวจ YAML, environment substitution และผลลัพธ์ config โดยยังไม่เริ่ม containers

> ผลลัพธ์ของ `docker compose config` อาจแสดงค่าจาก `.env` อย่านำ output ที่มี secrets ไปโพสต์ใน issue หรือ CI logs

### Pull image

```bash
IMAGE_TAG=sha-0123456789abcdef0123456789abcdef01234567 docker compose -f compose.prod.yaml pull
```

### เริ่ม production stack

```bash
IMAGE_TAG=sha-0123456789abcdef0123456789abcdef01234567 docker compose -f compose.prod.yaml up --detach
```

Compose จะทำงานตามลำดับ:

```text
postgres healthy
    → migrate สำเร็จ
        → app เริ่มทำงาน
```

### ดูสถานะทุก services

```bash
docker compose -f compose.prod.yaml ps --all
```

service `migrate` ควรจบด้วย exit code `0` ส่วน `app` และ `postgres` ควรอยู่ในสถานะ running

ตรวจ Docker health status ของ API:

```bash
docker inspect --format '{{.State.Health.Status}}' flowpocket-api-prod
```

ตรวจ container status และ health status พร้อมกัน:

```bash
docker inspect --format 'container={{.State.Status}} health={{.State.Health.Status}}' flowpocket-api-prod
```

Docker health status มีสามค่า:

| Status | ความหมาย |
| --- | --- |
| `starting` | container เริ่มแล้ว แต่ health check ยังไม่สำเร็จหรือยังอยู่ใน start period |
| `healthy` | health-check command สำเร็จด้วย exit code `0` |
| `unhealthy` | health check ล้มเหลวติดต่อกันครบจำนวน retries |

ดูผลการตรวจย้อนหลัง:

```bash
docker inspect --format '{{json .State.Health.Log}}' flowpocket-api-prod
```

หาก `.State.Health` เป็น `null` หมายถึง container ถูกสร้างจาก image ที่ไม่มี `HEALTHCHECK` ให้ pull image รุ่นใหม่และ recreate container

เรียก application health endpoint โดยตรง:

```bash
curl --fail --silent --show-error http://localhost:8080/health
```

### ดู logs ทุก services

```bash
docker compose -f compose.prod.yaml logs --follow --tail 100
```

ดูเฉพาะ API:

```bash
docker compose -f compose.prod.yaml logs --follow --tail 100 app
```

ดูเฉพาะ migration:

```bash
docker compose -f compose.prod.yaml logs migrate
```

ดูเฉพาะ PostgreSQL:

```bash
docker compose -f compose.prod.yaml logs --follow --tail 100 postgres
```

### Restart API

```bash
docker compose -f compose.prod.yaml restart app
```

`restart` ใช้ image และ config เดิม หากเปลี่ยน image tag หรือ Compose config ให้ใช้ `up --detach` แทน

### Pull และ replace ด้วย image ใหม่

```bash
IMAGE_TAG=sha-0123456789abcdef0123456789abcdef01234567 docker compose -f compose.prod.yaml pull app migrate
IMAGE_TAG=sha-0123456789abcdef0123456789abcdef01234567 docker compose -f compose.prod.yaml up --detach
```

### หยุด production stack

```bash
docker compose -f compose.prod.yaml stop
```

### นำ containers และ network ออกโดยเก็บ database

```bash
docker compose -f compose.prod.yaml down
```

named volume `postgres_prod_data` จะยังอยู่หากไม่ใส่ `--volumes`

## 5. รันคำสั่งภายใน container

เปิด shell ใน API container:

```bash
docker compose -f compose.prod.yaml exec app sh
```

ดู environment เฉพาะค่าที่ไม่เป็นความลับ:

```bash
docker compose -f compose.prod.yaml exec app sh -c 'printf "NODE_ENV=%s\nAPP_PORT=%s\nDB_HOST=%s\nDB_PORT=%s\n" "$NODE_ENV" "$APP_PORT" "$DB_HOST" "$DB_PORT"'
```

ตรวจ Node.js version:

```bash
docker compose -f compose.prod.yaml exec app node --version
```

ตรวจ process ภายใน container:

```bash
docker compose -f compose.prod.yaml top app
```

## 6. ตรวจสอบ containers และ resources

ดูการใช้ CPU และ memory แบบ real time:

```bash
docker stats
```

ดูเฉพาะ production API:

```bash
docker stats flowpocket-api-prod
```

ดู port mappings:

```bash
docker port flowpocket-api-prod
```

ดูรายละเอียด container:

```bash
docker inspect flowpocket-api-prod
```

ดู restart count และสถานะ:

```bash
docker inspect --format 'status={{.State.Status}} restart_count={{.RestartCount}} exit_code={{.State.ExitCode}}' flowpocket-api-prod
```

ดู events ของ Docker แบบต่อเนื่อง:

```bash
docker events
```

## 7. Images และ Docker Hub

Login เข้า Docker Hub แบบ interactive:

```bash
docker login --username montonjm
```

Docker จะขอ password/token โดยไม่ต้องเขียน token ลง command history

Pull immutable image:

```bash
docker pull montonjm/flowpocket:sha-0123456789abcdef0123456789abcdef01234567
```

ดู digest ของ image:

```bash
docker image inspect --format '{{index .RepoDigests 0}}' montonjm/flowpocket:sha-0123456789abcdef0123456789abcdef01234567
```

เพิ่ม tag สำหรับทดสอบในเครื่อง:

```bash
docker tag montonjm/flowpocket:sha-0123456789abcdef0123456789abcdef01234567 flowpocket:test
```

Logout เมื่อใช้เครื่องที่แชร์กับผู้อื่น:

```bash
docker logout
```

## 8. PostgreSQL backup และ restore

### Backup development database

```bash
docker compose -f compose.dev.yaml exec --no-TTY postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > flowpocket-dev-backup.sql
```

ไฟล์ backup ถูกเขียนลง directory ปัจจุบันบนเครื่อง host ไม่ได้อยู่ใน container

ตรวจว่าไฟล์มีข้อมูลก่อนนำไปใช้:

```bash
ls -lh flowpocket-dev-backup.sql
head -n 20 flowpocket-dev-backup.sql
```

### Backup production database

```bash
docker compose -f compose.prod.yaml exec --no-TTY postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > flowpocket-prod-backup.sql
```

ควรเข้ารหัส backup, จำกัดสิทธิ์ไฟล์ และจัดเก็บสำเนานอก production server

### Restore database

> คำสั่ง restore เปลี่ยนข้อมูลใน database ตรวจ environment, container และชื่อไฟล์ backup ให้ถูกต้องก่อนรันทุกครั้ง

Restore เข้า development database:

```bash
docker compose -f compose.dev.yaml exec --no-TTY postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < flowpocket-dev-backup.sql
```

ควรทดลอง restore กับ database ทดสอบก่อนใช้กับ production และตรวจว่า schema/data เดิมไม่ชนกับคำสั่งใน backup

## 9. Volumes

ดู volumes ทั้งหมด:

```bash
docker volume ls
```

ดูรายละเอียด development volume:

```bash
docker volume inspect flowpocket_postgres_dev_data
```

ชื่อจริงของ volume มี Compose project name เป็น prefix ซึ่งปกติคือชื่อ directory หากชื่อไม่ตรง ให้หาโดยใช้:

```bash
docker volume ls --filter name=postgres_dev_data
```

ดู production volume:

```bash
docker volume ls --filter name=postgres_prod_data
```

### ลบ development database ทั้งหมด

> คำสั่งต่อไปนี้ลบ named volume และข้อมูล PostgreSQL ของ development กู้คืนไม่ได้หากไม่มี backup

ตรวจ target ก่อน:

```bash
docker compose -f compose.dev.yaml ps --all
docker volume ls --filter name=postgres_dev_data
```

เมื่อตั้งใจล้าง development database จริง:

```bash
docker compose -f compose.dev.yaml down --volumes
```

อย่าใช้ `down --volumes` กับ `compose.prod.yaml` เว้นแต่ตั้งใจลบ production database และมี backup ที่ทดสอบ restore แล้ว

## 10. Cleanup อย่างปลอดภัย

ดูพื้นที่ที่ Docker ใช้:

```bash
docker system df
```

ลบ stopped containers:

```bash
docker container prune
```

ลบ dangling images:

```bash
docker image prune
```

ลบ build cache ที่ไม่ใช้:

```bash
docker builder prune
```

ลบ unused networks:

```bash
docker network prune
```

คำสั่ง `prune` จะแสดงรายการยืนยันก่อนลบ ควรอ่าน target ทุกครั้ง โดยเฉพาะบนเครื่อง production

หลีกเลี่ยงคำสั่งกว้าง เช่น:

```text
docker system prune --all --volumes
```

เพราะอาจลบ images, build cache, networks และ volumes ที่ระบบอื่นยังต้องใช้

## 11. Troubleshooting แบบรวดเร็ว

### Port ถูกใช้งานอยู่

ดูว่า container ใดเปิด port:

```bash
docker ps --format 'table {{.Names}}\t{{.Ports}}'
```

เปลี่ยน development PostgreSQL port ชั่วคราว:

```bash
POSTGRES_HOST_PORT=5435 docker compose -f compose.dev.yaml up --detach
```

เปลี่ยน production API port ชั่วคราว:

```bash
APP_PORT=8081 IMAGE_TAG=sha-0123456789abcdef0123456789abcdef01234567 docker compose -f compose.prod.yaml up --detach
```

### Container หยุดทันที

```bash
docker compose -f compose.prod.yaml ps --all
docker compose -f compose.prod.yaml logs --tail 200 app
docker inspect --format 'exit_code={{.State.ExitCode}} error={{.State.Error}}' flowpocket-api-prod
```

### Migration ไม่ผ่าน

```bash
docker compose -f compose.prod.yaml ps --all
docker compose -f compose.prod.yaml logs migrate
docker compose -f compose.prod.yaml logs postgres
```

แก้สาเหตุก่อนเริ่ม `app` ใหม่ ไม่ควรข้าม migration ด้วยการแก้ `depends_on` ชั่วคราวใน production

### Database ไม่ healthy

```bash
docker inspect --format '{{json .State.Health}}' flowpocket-postgres-prod
docker compose -f compose.prod.yaml logs --tail 200 postgres
docker compose -f compose.prod.yaml exec postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

### ตรวจว่า Compose ใช้ image tag ใด

```bash
docker inspect --format '{{.Config.Image}}' flowpocket-api-prod
```

## Quick reference

| งาน | คำสั่ง |
| --- | --- |
| เริ่ม development DB | `docker compose -f compose.dev.yaml up -d` |
| ดู development logs | `docker compose -f compose.dev.yaml logs -f postgres` |
| หยุด development stack | `docker compose -f compose.dev.yaml down` |
| Build local image | `docker build -t flowpocket:local .` |
| ตรวจ production config | `docker compose -f compose.prod.yaml config` |
| เริ่ม production stack | `docker compose -f compose.prod.yaml up -d` |
| ดู production status | `docker compose -f compose.prod.yaml ps -a` |
| ดู API logs | `docker compose -f compose.prod.yaml logs -f app` |
| ดู resource usage | `docker stats` |
| ดู disk usage | `docker system df` |

คำสั่งแบบย่อ `-d`, `-f`, `-a` และ `-t` ให้ผลเหมือนกับ `--detach`, `--file`, `--all` และ `--tag` ตามลำดับ

ดูขั้นตอนเกี่ยวกับ Docker Hub โดยละเอียดใน [คู่มือ Build, Tag, Push และ Pull](./DOCKER_HUB_GUIDE.md)

ดูคำอธิบายโครงสร้าง image และ services ใน [คู่มือ Dockerfile และ Docker Compose](./DOCKERFILE_COMPOSE_GUIDE.md)
