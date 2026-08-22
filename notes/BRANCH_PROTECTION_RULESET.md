# คู่มือตั้ง Branch Protection Ruleset สำหรับ `main`

เอกสารนี้อธิบายการป้องกัน branch `main` ของ FlowPocket ด้วย GitHub Repository Ruleset เพื่อบังคับให้ทุกการเปลี่ยนแปลงผ่าน Pull Request และ CI ก่อน merge

## เป้าหมาย

- ป้องกันการ push ตรงเข้า `main`
- บังคับให้เปลี่ยนแปลงผ่าน Pull Request
- บังคับให้ CI check `build` ผ่าน
- บังคับให้ Pull Request อัปเดตกับ `main` ก่อน merge
- ป้องกัน force push
- ป้องกันการลบ `main`

## สิ่งที่ต้องมีก่อนเริ่ม

- มีสิทธิ์ Admin ของ repository หรือสิทธิ์ `edit repository rules`
- GitHub Actions workflow เคยทำงานบน Pull Request เข้า `main` อย่างน้อยหนึ่งครั้ง
- CI job `build` ผ่านสำเร็จ เพื่อให้ GitHub แสดงชื่อนี้ในรายการ status checks

Workflow ของ FlowPocket อยู่ที่ `.github/workflows/docker.yml` และใช้ job ID:

```yaml
jobs:
  build:
```

ดังนั้น required status check ที่ต้องเลือกคือ `build` ซึ่งปัจจุบันตรวจ:

```text
npm ci
  → npm run lint
  → npm run build
  → Docker image build
```

## 1. เปิดหน้าสร้าง Ruleset

1. เปิด repository `alias-th/flowPocket` บน GitHub
2. ไปที่ **Settings**
3. เลือก **Rules** → **Rulesets**
4. กด **New ruleset** → **New branch ruleset**

## 2. ตั้งค่าพื้นฐาน

กำหนดค่าดังนี้:

| ตัวเลือก | ค่า |
| --- | --- |
| Ruleset name | `Protect main` |
| Enforcement status | `Active` |
| Bypass list | ปล่อยว่าง |

การปล่อย Bypass list ว่างทำให้กฎมีผลกับผู้ดูแล repository ด้วย ลดโอกาสเผลอ push ข้าม Pull Request

## 3. เลือก branch เป้าหมาย

ในหัวข้อ **Target branches**:

1. กด **Add target**
2. เลือก **Include default branch**

วิธีนี้จะครอบคลุม `main` เมื่อ `main` เป็น default branch

อีกวิธีคือเลือก **Include by pattern** แล้วกำหนด pattern เป็น:

```text
main
```

## 4. ป้องกันการลบและ force push

ในหัวข้อ **Branch protections** ให้เปิด:

- **Restrict deletions**
- **Block force pushes**

ไม่ต้องเปิด **Restrict updates** เพราะกฎนี้จำกัดการอัปเดต branch ให้เฉพาะผู้มีสิทธิ์ bypass และอาจทำให้ merge Pull Request ตามปกติไม่ได้

## 5. บังคับให้ใช้ Pull Request

เปิด **Require a pull request before merging**

ค่าที่แนะนำ:

| ตัวเลือก | ทำคนเดียว | ทำงานเป็นทีม |
| --- | --- | --- |
| Required approvals | `0` | อย่างน้อย `1` |
| Dismiss stale approvals after new commits | ปิด | เปิด |
| Require approval of most recent push | ปิด | เปิด |
| Require review from Code Owners | ปิด | เปิดเมื่อมี `CODEOWNERS` |
| Require conversation resolution | เปิด | เปิด |

> หากดูแล repository คนเดียว อย่าตั้ง Required approvals เป็น `1` เพราะเจ้าของ Pull Request ไม่สามารถ approve Pull Request ของตัวเองได้

## 6. บังคับให้ CI ผ่าน

1. เปิด **Require status checks to pass**
2. กด **Add checks**
3. ค้นหา `build`
4. เลือก check `build`
5. หากเลือก source ได้ ให้เลือก **GitHub Actions**
6. เปิด **Require branches to be up to date before merging**

หากค้นหา `build` ไม่พบ:

1. เปิด Pull Request จาก branch อื่นเข้า `main`
2. รอ workflow **Build and Push Docker Image** ทำงานจนผ่าน
3. กลับมาเปิดหน้า Ruleset ใหม่
4. ค้นหา `build` อีกครั้ง

## 7. ตรวจค่าก่อนสร้าง

ตรวจให้ได้ค่าดังนี้:

- [ ] Enforcement status เป็น `Active`
- [ ] Target branch ครอบคลุม `main`
- [ ] เปิด Restrict deletions
- [ ] เปิด Block force pushes
- [ ] เปิด Require a pull request before merging
- [ ] Required approvals เหมาะกับจำนวนสมาชิก
- [ ] เปิด Require conversation resolution
- [ ] Required status check มี `build`
- [ ] เปิด Require branches to be up to date before merging
- [ ] ไม่ได้เปิด Restrict updates

จากนั้นกด **Create**

Ruleset จะมีผลทันทีเมื่อ Enforcement status เป็น `Active`

## 8. ทดสอบด้วย Pull Request ปัจจุบัน

ใช้ Pull Request จาก branch `ci/add-eslint` เข้า `main` แล้วตรวจว่า:

- GitHub แสดง required check `build`
- ไม่สามารถ merge ขณะที่ `build` ยังทำงานหรือไม่ผ่าน
- หาก branch ล้าหลัง `main` ระบบขอให้อัปเดต branch ก่อน
- merge ได้เมื่อ checks และเงื่อนไขทั้งหมดผ่าน

หลัง merge ให้ตรวจ workflow จาก event `push` ว่า build และ push Docker image สำเร็จ

## 9. ทดสอบว่าห้าม push ตรง

หลัง merge ให้สร้าง commit ทดสอบบน feature branch เสมอ ไม่ควรสร้าง commit ที่ไม่ต้องการบน local `main` เพียงเพื่อทดสอบกฎ

หากมี commit ที่ตั้งใจจะส่งเข้า `main` แล้วลอง push ตรง:

```bash
git push origin main
```

GitHub ต้องปฏิเสธการ push และแจ้งว่าการเปลี่ยนแปลงต้องผ่าน Pull Request

## ปัญหาที่พบบ่อย

### CI ผ่าน แต่ merge ไม่ได้

ดูข้อความใน merge box โดยสาเหตุทั่วไปคือ:

- branch ยังไม่อัปเดตกับ `main`
- ยังมี conversation ที่ไม่ได้ resolve
- ยังไม่ได้รับ approval ตามจำนวนที่กำหนด
- มี Ruleset หรือ Branch protection อื่นใช้กับ `main` พร้อมกัน

### Required check ค้าง

ตรวจว่า workflow trigger รองรับ `pull_request` เข้า `main` และ job ID ยังเป็น `build`

### ผู้ดูแลยัง push ตรงได้

ตรวจ Bypass list ว่ามีบัญชีผู้ดูแลหรือ `Repository administrators` อยู่หรือไม่

### เปลี่ยนชื่อ CI job แล้ว PR ถูก block

เมื่อเปลี่ยน job ID เช่นจาก `build` เป็น `quality` ต้องแก้ required status check ใน Ruleset ให้เป็นชื่อใหม่ด้วย

## เอกสารอ้างอิง

- [Creating rulesets for a repository](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository)
- [Available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)
- [คู่มือ CI ของ FlowPocket](./CI_GUIDE.md)
