# คู่มือ Docker Hub: Build, Tag, Push และ Pull

เอกสารนี้อธิบายการนำ Docker image ของ FlowPocket ขึ้น Docker Hub การกำหนด tag การ pull image ลงเครื่อง และแนวทางเลือก tag สำหรับ production

Docker Hub repository ของโปรเจกต์:

```text
montonjm/flowpocket
```

## ภาพรวมตั้งแต่เริ่มต้น

```text
สร้างและยืนยัน Docker account
    → สร้าง Docker Hub repository
    → สร้าง access token
    → Login จาก Docker CLI
    → Build image
    → เพิ่ม tag
    → Push ไป Docker Hub
    → ตรวจ tag และ digest
    → Pull ไปใช้งาน
    → ตั้ง GitHub Actions ให้ทำอัตโนมัติ
```

## 1. สร้าง Docker Hub account

1. เปิด [Docker Hub](https://hub.docker.com/)
2. กด **Sign up** หากยังไม่มีบัญชี หรือ **Sign in** หากมีแล้ว
3. สร้าง Docker ID/username ที่ต้องการใช้เป็น namespace
4. ยืนยัน email ของบัญชีให้เรียบร้อย
5. เปิดใช้งาน multi-factor authentication หากบัญชีรองรับ

สำหรับคู่มือนี้ Docker Hub namespace คือ:

```text
montonjm
```

ดังนั้น image ของโปรเจกต์จะขึ้นต้นด้วย:

```text
montonjm/flowpocket
```

Docker ID เป็นส่วนหนึ่งของชื่อ image และ URL ควรเลือกชื่อที่ต้องการใช้ระยะยาว

## 2. สร้าง repository บน Docker Hub

1. Sign in เข้า Docker Hub
2. เลือก **My Hub** → **Repositories**
3. กด **Create repository**
4. ตั้ง **Namespace** เป็น `montonjm`
5. ตั้ง **Repository name** เป็น `flowpocket`
6. ใส่ Short description เช่น `FlowPocket API container image`
7. เลือก visibility
8. กด **Create**

ค่าของ FlowPocket:

| ตัวเลือก | ค่า |
| --- | --- |
| Namespace | `montonjm` |
| Repository name | `flowpocket` |
| Full repository name | `montonjm/flowpocket` |
| Short description | `FlowPocket API container image` |

ชื่อ repository ต้องเป็นตัวพิมพ์เล็ก ใช้ตัวเลข, `-` และ `_` ได้ และควรตรวจชื่อให้ถูกต้องก่อนสร้าง เพราะ Docker Hub ไม่อนุญาตให้ rename repository หลังสร้าง

### เลือก Public หรือ Private

| Visibility | ใคร pull ได้ | เหมาะกับ |
| --- | --- | --- |
| Public | ทุกคน | Open source, demo และ image ที่ไม่มี proprietary code |
| Private | เฉพาะบัญชี/ผู้ร่วมงานที่ได้รับอนุญาต | ระบบธุรกิจและ production image ที่ไม่ต้องการเผยแพร่ |

หากเลือก Private:

- เครื่อง development, staging และ production ต้อง login ก่อน pull
- CI ต้องมี credential สำหรับ push
- ต้องจัดการ collaborator/team permissions
- ต้องตรวจข้อจำกัดของ Docker Hub plan ที่ใช้อยู่

ไม่ว่าจะเลือก visibility ใด ห้ามบรรจุ `.env`, private keys หรือ credentials ลง image เพราะผู้ที่ pull image และมีสิทธิ์เข้าถึงสามารถตรวจ layers ของ image ได้

### ตรวจ repository หลังสร้าง

เปิดหน้า repository แล้วตรวจว่าแสดงชื่อ:

```text
montonjm/flowpocket
```

ในช่วงนี้หน้า Tags/Images อาจยังว่าง ซึ่งเป็นเรื่องปกติเพราะยังไม่ได้ push image

> Docker Hub สามารถสร้าง repository บางกรณีระหว่าง push ได้ แต่สำหรับ production ควรสร้างผ่านหน้าเว็บก่อน เพื่อกำหนด namespace, visibility, description และ access policy อย่างตั้งใจ

## 3. สร้าง Docker Hub access token

ควรใช้ Personal Access Token (PAT) แทนรหัสผ่านบัญชีสำหรับ Docker CLI และ GitHub Actions

1. Sign in เข้า Docker Hub
2. กดรูป avatar ด้านขวาบน
3. เลือก **Account settings**
4. เลือก **Personal access tokens**
5. กด **Generate new token**
6. ตั้ง description ให้บอกจุดประสงค์ เช่น `flowpocket-local-push`
7. กำหนดวันหมดอายุตามนโยบาย
8. เลือก permission อย่างน้อย **Read & Write** สำหรับ token ที่ใช้ push
9. กด **Generate**
10. คัดลอก token และเก็บใน password manager ทันที

Docker Hub จะแสดง token ให้คัดลอกเพียงครั้งเดียว เมื่อออกจากหน้าดังกล่าวจะไม่สามารถเปิดดูค่าเดิมได้

### แยก token ตามการใช้งาน

แนะนำให้แยก tokens:

| Token | Permission | ใช้ที่ไหน |
| --- | --- | --- |
| `flowpocket-local-push` | Read & Write | เครื่องพัฒนา |
| `flowpocket-github-actions` | Read & Write | GitHub Actions secret |
| `flowpocket-production-pull` | Read-only | Production server หาก repository เป็น private |

ข้อดีคือสามารถ revoke token ที่รั่วหรือเลิกใช้งานได้โดยไม่กระทบทุกระบบ

ไม่ควรให้สิทธิ์ Delete หาก workflow มีหน้าที่เพียง push/pull และควร rotate token ก่อนหมดอายุ

## 4. รูปแบบชื่อ Docker image

ชื่อ image แบบเต็มประกอบด้วย:

```text
REGISTRY/OWNER/REPOSITORY:TAG
```

ตัวอย่าง:

```text
docker.io/montonjm/flowpocket:v1.1.0
```

เมื่อไม่ระบุ registry Docker จะใช้ Docker Hub หรือ `docker.io` เป็นค่าเริ่มต้น จึงเขียนแบบย่อได้ว่า:

```text
montonjm/flowpocket:v1.1.0
```

ส่วนประกอบคือ:

| ส่วน | ค่า |
| --- | --- |
| Registry | `docker.io` |
| Docker Hub username/organization | `montonjm` |
| Repository | `flowpocket` |
| Tag | `v1.1.0` |

ถ้าไม่ระบุ tag Docker จะใช้ `latest` โดยอัตโนมัติ แต่ `latest` ไม่ได้หมายถึง image ที่ใหม่ที่สุดตามเวลาเสมอไป เป็นเพียง tag ชื่อหนึ่งเท่านั้น

## 5. ตรวจสอบ Docker ในเครื่อง

ตรวจ Docker:

```bash
docker --version
docker info
```

ตรวจว่า Dockerfile build ได้:

```bash
docker build --tag flowpocket:local .
```

ดู image:

```bash
docker image ls flowpocket
```

## 6. Login เข้า Docker Hub

ใช้ Docker Hub access token แทนรหัสผ่านบัญชีหลัก:

```bash
docker login --username montonjm
```

Docker จะถาม password ให้ใส่ access token ที่ prompt วิธีนี้ช่วยไม่ให้ token ปรากฏใน shell history

เมื่อสำเร็จจะแสดง:

```text
Login Succeeded
```

ห้ามเขียน token ลงเอกสาร, Git repository, Dockerfile หรือ command ที่อาจถูกบันทึกใน shell history

ออกจากระบบเมื่อใช้เครื่องที่แชร์กับผู้อื่น:

```bash
docker logout
```

## 7. Build image พร้อม Docker Hub tag

### Tag สำหรับทดลอง

```bash
docker build --tag montonjm/flowpocket:test .
```

### Version tag

```bash
docker build --tag montonjm/flowpocket:v1.1.0 .
```

### Commit SHA tag

นำ Git commit SHA ปัจจุบันมาใช้เป็น tag:

```bash
git rev-parse HEAD
```

สมมติได้ SHA:

```text
0123456789abcdef0123456789abcdef01234567
```

Build ด้วย tag ที่สัมพันธ์กับ source commit:

```bash
docker build --tag montonjm/flowpocket:sha-0123456789abcdef0123456789abcdef01234567 .
```

การใช้ SHA แบบเต็มช่วยตรวจย้อนกลับจาก image ไปยัง source commit ได้ชัดเจน

## 8. เพิ่ม tag ให้ image ที่ build แล้ว

คำสั่ง `docker tag` ไม่ได้ build หรือคัดลอก image ใหม่ แต่สร้างชื่ออ้างอิงอีกชื่อให้ image เดิม

หากมี local image:

```text
flowpocket:local
```

เพิ่ม version tag:

```bash
docker tag flowpocket:local montonjm/flowpocket:v1.1.0
```

เพิ่ม commit SHA tag:

```bash
docker tag flowpocket:local montonjm/flowpocket:sha-0123456789abcdef0123456789abcdef01234567
```

เพิ่ม `latest`:

```bash
docker tag flowpocket:local montonjm/flowpocket:latest
```

ตรวจ tags ทั้งหมด:

```bash
docker image ls montonjm/flowpocket
```

หลาย tags อาจแสดง image ID เดียวกัน ซึ่งหมายความว่าทุก tag ชี้ไปยัง image เดียวกัน

## 9. Push image ไป Docker Hub

ต้อง login และตั้งชื่อ image ให้มี Docker Hub owner/repository ก่อน

Push version tag:

```bash
docker push montonjm/flowpocket:v1.1.0
```

Push commit SHA tag:

```bash
docker push montonjm/flowpocket:sha-0123456789abcdef0123456789abcdef01234567
```

Push `latest`:

```bash
docker push montonjm/flowpocket:latest
```

หาก image เดียวมีหลาย tags ต้อง push แต่ละ tag หรือใช้ `--all-tags`:

```bash
docker push --all-tags montonjm/flowpocket
```

> ระวัง `--all-tags` จะ push ทุก local tag ของ repository นี้ รวมถึง tag ทดลองที่อาจไม่ต้องการเผยแพร่ ตรวจด้วย `docker image ls montonjm/flowpocket` ก่อนใช้

## 10. ขั้นตอน manual release ที่แนะนำ

สมมติ release version `v1.1.0` จาก commit ที่ต้องการ:

1. ตรวจว่า working tree สะอาด:

```bash
git status --short
```

คำสั่งไม่ควรแสดงไฟล์ที่ยังไม่ได้ commit

2. ตรวจ commit SHA:

```bash
git rev-parse HEAD
```

3. รัน quality checks:

```bash
npm ci
npm run lint
npm run build
```

4. Build image หนึ่งครั้ง:

```bash
docker build --tag flowpocket:release-candidate .
```

5. ทดสอบ image ตามขั้นตอนของโปรเจกต์

6. เพิ่ม tags ให้ image เดียวกัน:

```bash
docker tag flowpocket:release-candidate montonjm/flowpocket:v1.1.0
docker tag flowpocket:release-candidate montonjm/flowpocket:sha-0123456789abcdef0123456789abcdef01234567
docker tag flowpocket:release-candidate montonjm/flowpocket:latest
```

7. Push immutable tags ก่อน:

```bash
docker push montonjm/flowpocket:v1.1.0
docker push montonjm/flowpocket:sha-0123456789abcdef0123456789abcdef01234567
```

8. Push `latest` เมื่อ immutable tags สำเร็จ:

```bash
docker push montonjm/flowpocket:latest
```

9. ตรวจ tags และ digest บน Docker Hub

สำหรับ production จริงควรให้ GitHub Actions สร้างและ push image เพื่อให้กระบวนการทำซ้ำและตรวจสอบย้อนหลังได้ manual release เหมาะสำหรับการเรียนรู้หรือกรณีฉุกเฉินที่มีขั้นตอนอนุมัติชัดเจน

## 11. Pull image จาก Docker Hub

Pull version tag:

```bash
docker pull montonjm/flowpocket:v1.1.0
```

Pull commit SHA tag:

```bash
docker pull montonjm/flowpocket:sha-0123456789abcdef0123456789abcdef01234567
```

Pull `latest`:

```bash
docker pull montonjm/flowpocket:latest
```

ถ้า repository เป็น private ต้อง `docker login` ก่อน pull

ตรวจว่า pull สำเร็จ:

```bash
docker image ls montonjm/flowpocket
```

ดู image ID, creation time และ metadata:

```bash
docker image inspect montonjm/flowpocket:v1.1.0
```

## 12. Pull ด้วย digest

Tag สามารถเปลี่ยนให้ชี้ image อื่นได้ แต่ digest ระบุ content ของ image แบบ immutable

ดู repository digest หลัง pull:

```bash
docker image inspect --format '{{index .RepoDigests 0}}' montonjm/flowpocket:v1.1.0
```

ผลลัพธ์มีรูปแบบ:

```text
montonjm/flowpocket@sha256:DIGEST_VALUE
```

Pull ด้วย digest:

```bash
docker pull montonjm/flowpocket@sha256:DIGEST_VALUE
```

production ที่ต้องการความแน่นอนสูงสุดสามารถบันทึกและ deploy ด้วย digest เพื่อรับประกันว่าได้ image content เดิม

## 13. ใช้ image tag กับ Production Compose

`compose.prod.yaml` รองรับตัวแปร `IMAGE_TAG`:

```yaml
image: montonjm/flowpocket:${IMAGE_TAG:-latest}
```

Pull image ที่ระบุ:

```bash
IMAGE_TAG=v1.1.0 docker compose -f compose.prod.yaml pull
```

เริ่ม production stack ด้วย version tag:

```bash
IMAGE_TAG=v1.1.0 docker compose -f compose.prod.yaml up --detach
```

ใช้ commit SHA tag:

```bash
IMAGE_TAG=sha-0123456789abcdef0123456789abcdef01234567 docker compose -f compose.prod.yaml pull
IMAGE_TAG=sha-0123456789abcdef0123456789abcdef01234567 docker compose -f compose.prod.yaml up --detach
```

ตรวจว่า API container ใช้ image ใด:

```bash
docker inspect --format '{{.Config.Image}}' flowpocket-api-prod
```

## 14. เลือก tag แบบไหนดี

| Tag | ตัวอย่าง | เปลี่ยนชี้ image ใหม่ได้หรือไม่ | การใช้งาน |
| --- | --- | --- | --- |
| Development | `dev`, `test` | ได้ | ทดลองเท่านั้น |
| Branch | `main` | ได้ | environment ที่ตาม branch |
| Latest | `latest` | ได้ | local/demo ไม่ควรใช้ยืนยัน production version |
| Semantic version | `v1.1.0` | ไม่ควรเปลี่ยน | release ที่อ่านง่าย |
| Commit SHA | `sha-012345...` | ไม่ควรเปลี่ยน | deploy, audit และ rollback |
| Digest | `@sha256:...` | ไม่เปลี่ยน | production ที่ต้องการระบุ content แน่นอน |

นโยบายที่แนะนำ:

- Pull Request: build แต่ไม่ push
- Merge เข้า `main`: push `sha-{COMMIT_SHA}` และอาจอัปเดต `latest`
- Release: เพิ่ม immutable tag `vX.Y.Z`
- Staging/production: deploy ด้วย `sha-*`, version หรือ digest
- ห้ามเขียนทับ version และ commit SHA tags เดิม

## 15. ตั้ง GitHub Actions ให้ push อัตโนมัติ

Workflow `.github/workflows/docker.yml` ทำงานดังนี้:

### Pull Request เข้า `main`

```yaml
push: false
tags: montonjm/flowpocket:test
```

CI build image เพื่อตรวจ Dockerfile แต่ไม่ push ไป Docker Hub และไม่ใช้ Docker Hub token

### Push หรือ merge เข้า `main`

```yaml
push: true
tags: |
  montonjm/flowpocket:latest
  montonjm/flowpocket:sha-${{ github.sha }}
```

GitHub Actions login ด้วย:

```yaml
username: ${{ vars.DOCKERHUB_USERNAME }}
password: ${{ secrets.DOCKERHUB_TOKEN }}
```

ค่าที่ต้องตั้งใน GitHub repository:

| Type | Name | Value |
| --- | --- | --- |
| Repository variable | `DOCKERHUB_USERNAME` | `montonjm` |
| Repository secret | `DOCKERHUB_TOKEN` | Docker Hub access token |

ห้ามใส่ access token โดยตรงใน workflow

## 16. ลบ local tags และ images

ลบ tag เดียวจากเครื่อง:

```bash
docker image rm montonjm/flowpocket:test
```

ลบหลาย tags:

```bash
docker image rm montonjm/flowpocket:v1.1.0 montonjm/flowpocket:latest
```

ถ้า tags อื่นยังชี้ image เดียวกัน Docker จะลบเฉพาะชื่ออ้างอิงและยังเก็บ layers ที่มีผู้ใช้อยู่

ลบ dangling images:

```bash
docker image prune
```

การลบ local image ไม่ได้ลบ image บน Docker Hub หากต้องการลบ remote tag ให้ตรวจ repository และ tag ใน Docker Hub UI อย่างระมัดระวัง

## 17. Troubleshooting

### `requested access to the resource is denied`

ตรวจว่า:

- login ด้วยบัญชี `montonjm` หรือบัญชีที่มีสิทธิ์ push
- access token มีสิทธิ์ Write
- image name เป็น `montonjm/flowpocket:TAG`
- Docker Hub repository มีอยู่จริง

ลอง login ใหม่:

```bash
docker logout
docker login --username montonjm
```

### `tag does not exist`

ตรวจ local tags:

```bash
docker image ls montonjm/flowpocket
```

ถ้ามีเฉพาะ `flowpocket:local` ให้เพิ่ม tag ก่อน push:

```bash
docker tag flowpocket:local montonjm/flowpocket:v1.1.0
docker push montonjm/flowpocket:v1.1.0
```

### Pull แล้วได้ image ไม่ตรงที่คาด

- ตรวจว่าระบุ tag ถูกต้อง
- หลีกเลี่ยง `latest` เมื่อจำเป็นต้องระบุ version
- เปรียบเทียบ digest จาก Docker Hub กับ `RepoDigests` ในเครื่อง
- ลอง pull tag ที่ต้องการอีกครั้ง

```bash
docker pull montonjm/flowpocket:v1.1.0
docker image inspect --format '{{index .RepoDigests 0}}' montonjm/flowpocket:v1.1.0
```

### Push สำเร็จแต่ production ยังใช้ image เดิม

`docker compose up` อาจใช้ local image ที่มีอยู่ ให้ pull ก่อนและระบุ tag ให้ตรง:

```bash
IMAGE_TAG=v1.1.0 docker compose -f compose.prod.yaml pull
IMAGE_TAG=v1.1.0 docker compose -f compose.prod.yaml up --detach
```

ตรวจ image ที่ container ใช้:

```bash
docker inspect --format '{{.Config.Image}}' flowpocket-api-prod
```

## Quick reference

| งาน | คำสั่ง |
| --- | --- |
| Login | `docker login --username montonjm` |
| Build local | `docker build -t flowpocket:local .` |
| เพิ่ม version tag | `docker tag flowpocket:local montonjm/flowpocket:v1.1.0` |
| Push version | `docker push montonjm/flowpocket:v1.1.0` |
| Pull version | `docker pull montonjm/flowpocket:v1.1.0` |
| ดู images | `docker image ls montonjm/flowpocket` |
| ดู digest | `docker image inspect --format '{{index .RepoDigests 0}}' montonjm/flowpocket:v1.1.0` |
| Deploy version | `IMAGE_TAG=v1.1.0 docker compose -f compose.prod.yaml up -d` |
| Logout | `docker logout` |

## เอกสารที่เกี่ยวข้อง

- [Useful Docker Commands สำหรับ FlowPocket](./DOCKER_COMMANDS.md)
- [คู่มือ Dockerfile และ Docker Compose](./DOCKERFILE_COMPOSE_GUIDE.md)
- [คู่มือ CI สำหรับ FlowPocket](./CI_GUIDE.md)
- [Docker Docs: Create a repository](https://docs.docker.com/docker-hub/repos/create/)
- [Docker Docs: Personal access tokens](https://docs.docker.com/security/access-tokens/)
- [Docker Docs: Push images to a repository](https://docs.docker.com/docker-hub/repos/manage/hub-images/push/)
