# Useful Git Commands สำหรับ FlowPocket

เอกสารนี้รวบรวมคำสั่ง Git ที่ใช้บ่อย ตั้งแต่เริ่มต้น การทำงานด้วย feature branch และ Pull Request ไปจนถึงการตรวจสอบและกู้คืนการเปลี่ยนแปลง

Repository ของโปรเจกต์:

```text
git@github.com:alias-th/flowPocket.git
```

Workflow ที่แนะนำ:

```text
อัปเดต main
    → สร้าง feature branch
    → แก้ไฟล์
    → ตรวจ diff
    → commit
    → push
    → เปิด Pull Request
    → CI ผ่านและ review
    → merge เข้า main
    → ลบ feature branch
```

## 1. ตรวจสอบ Git

ดูเวอร์ชัน:

```bash
git --version
```

ดู configuration:

```bash
git config --list
```

ดูชื่อและ email ที่ใช้สร้าง commit:

```bash
git config user.name
git config user.email
```

ตั้งค่าสำหรับทุก repositories ในเครื่อง:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

ตั้งค่าเฉพาะ repository ปัจจุบัน:

```bash
git config user.name "Your Name"
git config user.email "you@example.com"
```

ค่าระดับ repository จะ override ค่า global

## 2. Clone repository

Clone ด้วย SSH:

```bash
git clone git@github.com:alias-th/flowPocket.git
cd flowPocket
```

Clone ด้วย HTTPS:

```bash
git clone https://github.com/alias-th/flowPocket.git
cd flowPocket
```

ตรวจ remote:

```bash
git remote --verbose
```

ผลลัพธ์ควรมี remote `origin` ชี้ไป repository ของ FlowPocket

## 3. ตรวจสถานะ repository

ดูสถานะแบบย่อ:

```bash
git status --short
```

สัญลักษณ์ที่พบบ่อย:

| สัญลักษณ์ | ความหมาย                       |
| --------- | ------------------------------ |
| `??`      | ไฟล์ใหม่ที่ Git ยังไม่ติดตาม   |
| ` M`      | แก้ไฟล์แล้วแต่ยังไม่ stage     |
| `M `      | แก้ไฟล์และ stage แล้ว          |
| `A `      | เพิ่มไฟล์ใหม่เข้า staging area |
| `D `      | ลบไฟล์และ stage แล้ว           |
| `UU`      | มี merge conflict              |

ดู branch ปัจจุบัน:

```bash
git branch --show-current
```

ดูสถานะพร้อมรายละเอียด:

```bash
git status
```

## 4. ดูประวัติ commits

ดูประวัติแบบย่อ:

```bash
git log --oneline --decorate --graph --all
```

ดู 10 commits ล่าสุด:

```bash
git log -10 --oneline
```

ดูรายละเอียด commit ล่าสุด:

```bash
git show HEAD
```

ดู commit ที่แก้ไฟล์หนึ่ง:

```bash
git log --oneline -- Dockerfile
```

ดูว่าใครแก้แต่ละบรรทัด:

```bash
git blame Dockerfile
```

## 5. อัปเดตข้อมูลจาก remote

ดาวน์โหลดข้อมูล remote โดยยังไม่แก้ working tree:

```bash
git fetch origin
```

ดูว่า local branch ต่างจาก remote อย่างไร:

```bash
git status --short --branch
```

อัปเดต `main` แบบไม่สร้าง merge commit โดยไม่ตั้งใจ:

```bash
git switch main
git pull --ff-only origin main
```

`--ff-only` จะหยุดหาก local และ remote แยกประวัติกัน แทนการสร้าง merge commit อัตโนมัติ

Error:

```text
      C  local
     /
A---B
     \
      D  origin/main
```

## 6. Branches

ดู local branches:

```bash
git branch
```

ดู local และ remote branches:

```bash
git branch --all
```

สร้าง branch จาก `main` ล่าสุด:

```bash
git switch main
git pull --ff-only origin main
git switch --create feature/add-health-check
```

รูปแบบชื่อ branch ที่แนะนำ:

```text
feature/add-health-check
fix/database-timeout
ci/add-tests
docs/add-deployment-guide
refactor/auth-service
```

สลับ branch:

```bash
git switch ci/add-tests
```

สร้าง local branch จาก remote branch:

```bash
git switch --track origin/ci/add-tests
```

เปลี่ยนชื่อ branch ปัจจุบัน:

```bash
git branch --move ci/add-tests
```

## 7. ตรวจการเปลี่ยนแปลง

ดูการเปลี่ยนแปลงที่ยังไม่ stage:

```bash
git diff
```

ดูการเปลี่ยนแปลงที่ stage แล้ว:

```bash
git diff --staged
```

ดูสรุปจำนวนบรรทัด:

```bash
git diff --stat
```

ดูเฉพาะไฟล์:

```bash
git diff -- Dockerfile
```

ตรวจ whitespace errors:

```bash
git diff --check
```

เปรียบเทียบ branch ปัจจุบันกับ `main` บน remote:

```bash
git fetch origin
git diff origin/main...HEAD
```

ดู commits ที่จะเข้า Pull Request:

```bash
git log --oneline origin/main..HEAD
```

## 8. Stage files

Stage ไฟล์ที่ระบุ:

```bash
git add Dockerfile compose.prod.yaml
```

Stage directory:

```bash
git add docs
```

Stage ทุกการเปลี่ยนแปลงใน repository:

```bash
git add --all
```

ควรใช้ `git add --all` หลังตรวจ `git status` แล้วเท่านั้น เพื่อไม่เผลอเพิ่ม `.env`, generated files หรือไฟล์ที่ไม่เกี่ยวข้อง

เลือก stage ทีละส่วน:

```bash
git add --patch
```

ยกเลิก staging โดยเก็บการแก้ไฟล์ไว้:

```bash
git restore --staged Dockerfile
```

ยกเลิก staging ทุกไฟล์โดยเก็บการแก้ไว้:

```bash
git restore --staged .
```

## 9. Commit

ตรวจสิ่งที่จะ commit:

```bash
git status --short
git diff --staged
```

สร้าง commit:

```bash
git commit -m "docs: add Docker deployment guide"
```

ตัวอย่าง Conventional Commit prefixes:

| Prefix      | ใช้เมื่อ                            |
| ----------- | ----------------------------------- |
| `feat:`     | เพิ่มความสามารถใหม่                 |
| `fix:`      | แก้ bug                             |
| `docs:`     | แก้เอกสาร                           |
| `ci:`       | แก้ CI/CD workflow                  |
| `test:`     | เพิ่มหรือแก้ tests                  |
| `refactor:` | ปรับโครงสร้างโดยไม่เปลี่ยน behavior |
| `chore:`    | งานดูแลทั่วไป                       |

แก้ข้อความ commit ล่าสุดก่อน push:

```bash
git commit --amend -m "docs: add Docker and Compose guide"
```

เพิ่มไฟล์ที่ลืมเข้า commit ล่าสุดก่อน push:

```bash
git add docs/GIT_COMMANDS.md
git commit --amend --no-edit
```

> `amend` เปลี่ยน commit SHA ไม่ควรใช้กับ commit ที่ผู้อื่นดึงไปใช้งานแล้วโดยไม่ประสานงาน

## 10. Push

Push branch ครั้งแรกพร้อมตั้ง upstream:

```bash
git push --set-upstream origin docs/add-git-guide
```

หลังตั้ง upstream แล้วใช้:

```bash
git push
```

ตรวจ upstream:

```bash
git branch --verbose --verbose
```

ไม่ควร push ตรงเข้า `main` เมื่อ repository ใช้ Pull Request และ Ruleset

## 11. เปิด Pull Request

หลัง push branch เปิด GitHub repository แล้วเลือก **Compare & pull request**

กำหนด:

```text
base: main
compare: docs/add-git-guide
```

ก่อนเปิด PR ตรวจ:

```bash
git fetch origin
git log --oneline origin/main..HEAD
git diff --check
git status --short
```

PR description ควรมี:

```markdown
## Summary

- describe the changes

## Verification

- [x] `npm run lint`
- [x] `npm run build`
```

รอ CI check `build` และเงื่อนไข Ruleset ผ่านก่อน merge

## 12. อัปเดต feature branch กับ `main`

ดาวน์โหลด remote state:

```bash
git fetch origin
```

### วิธี merge

```bash
git merge origin/main
```

วิธีนี้ไม่เขียนประวัติ commits เดิมใหม่ และเหมาะเมื่อ branch มีผู้อื่นใช้งานร่วมกัน

### วิธี rebase

```bash
git rebase origin/main
```

วิธีนี้ทำให้ประวัติเป็นเส้นตรง แต่เปลี่ยน commit SHA หาก branch ถูก push แล้วอาจต้อง push ด้วย `--force-with-lease`

```bash
git push --force-with-lease
```

ใช้ `--force-with-lease` แทน `--force` เพราะจะปฏิเสธการเขียนทับเมื่อ remote มี commits ใหม่ที่ local ไม่รู้จัก

อย่า force push `main`

## 13. แก้ merge conflict

ดูไฟล์ที่ conflict:

```bash
git status
```

เปิดไฟล์แล้วหา markers:

```text
<<<<<<< HEAD
local changes
=======
incoming changes
>>>>>>> origin/main
```

แก้เนื้อหาให้ถูกต้องและลบ markers จากนั้น:

```bash
git add path/to/resolved-file
```

หากกำลัง merge:

```bash
git commit
```

หากกำลัง rebase:

```bash
git rebase --continue
```

ยกเลิก merge ที่ยังไม่เสร็จ:

```bash
git merge --abort
```

ยกเลิก rebase ที่ยังไม่เสร็จ:

```bash
git rebase --abort
```

หลังแก้ conflict ต้องรัน lint, build และ tests ใหม่

## 14. Stash

เก็บ tracked changes ชั่วคราว:

```bash
git stash push -m "work in progress"
```

เก็บ untracked files ด้วย:

```bash
git stash push --include-untracked -m "work in progress"
```

ดูรายการ stash:

```bash
git stash list
```

ดูรายละเอียด stash ล่าสุด:

```bash
git stash show --patch stash@{0}
```

นำ stash ล่าสุดกลับมาและลบออกจากรายการเมื่อสำเร็จ:

```bash
git stash pop
```

นำ stash กลับมาโดยยังเก็บรายการไว้:

```bash
git stash apply stash@{0}
```

ก่อนลบ stash ให้ตรวจรายการและเนื้อหา เพราะ stash ที่ลบแล้วกู้คืนได้ยาก

## 15. ยกเลิกการเปลี่ยนแปลงอย่างปลอดภัย

### ยกเลิกไฟล์ที่ยังไม่ stage

```bash
git restore path/to/file
```

> คำสั่งนี้ทิ้งการแก้ไฟล์ที่ยังไม่ commit ตรวจ `git diff` ก่อนรัน

### นำไฟล์เวอร์ชันจาก commit อื่นมาไว้ใน working tree

```bash
git restore --source HEAD~1 -- path/to/file
```

ตรวจ diff แล้ว commit การย้อนกลับเป็น commit ใหม่

### ย้อน commit ที่ push แล้ว

```bash
git revert COMMIT_SHA
```

`revert` สร้าง commit ใหม่ที่ย้อนผลของ commit เดิม จึงเหมาะกับ shared branches และ `main`

### ยกเลิก commit ล่าสุดที่ยังไม่ push โดยเก็บ changes staged

```bash
git reset --soft HEAD~1
```

`reset` เปลี่ยนประวัติ ใช้เฉพาะ local commits ที่ยังไม่แชร์ และตรวจ branch ให้ถูกต้องก่อนรัน

## 16. กู้ commit ด้วย reflog

หากสลับ branch, rebase หรือ reset แล้วหา commit ไม่พบ:

```bash
git reflog
```

ตรวจ commit ที่ต้องการ:

```bash
git show COMMIT_SHA
```

สร้าง recovery branch เพื่อเก็บ commit:

```bash
git branch recovery/lost-work COMMIT_SHA
```

วิธีสร้าง branch ปลอดภัยกว่าการ reset branch ปัจจุบันทันที

## 17. Tags และ releases

ดู tags:

```bash
git tag --list
```

สร้าง annotated version tag:

```bash
git tag --annotate v1.1.0 --message "Release v1.1.0"
```

Push tag ที่ระบุ:

```bash
git push origin v1.1.0
```

ตรวจ tag:

```bash
git show v1.1.0
```

ควรสร้าง release tag จาก commit บน `main` ที่ผ่าน CI แล้ว และไม่เปลี่ยน tag เดิมให้ชี้ commit ใหม่

## 18. ลบ branches หลัง merge

สลับออกจาก branch ที่จะลบและอัปเดต `main`:

```bash
git switch main
git pull --ff-only origin main
```

ลบ local branch ที่ merge แล้ว:

```bash
git branch --delete docs/add-git-guide
```

ลบ remote branch:

```bash
git push origin --delete docs/add-git-guide
```

`git branch -d` จะปฏิเสธหาก Git เห็นว่า branch ยังไม่ merge ส่วน `-D` บังคับลบและอาจทำให้งานสูญหาย จึงควรหลีกเลี่ยงหากยังไม่ได้ตรวจ commits

ลบ remote-tracking references ที่ไม่มีบน remote แล้ว:

```bash
git fetch --prune origin
```

## 19. ค้นหาการเปลี่ยนแปลง

ค้นหาข้อความใน tracked files:

```bash
git grep "DB_HOST"
```

ค้นหา commit ที่เพิ่มหรือลบข้อความ:

```bash
git log -S "DB_HOST" --oneline
```

ค้นหา commit ที่ diff ตรง regular expression:

```bash
git log -G "DB_(HOST|PORT)" --oneline
```

ดูประวัติพร้อม diff ของไฟล์:

```bash
git log --patch -- compose.prod.yaml
```

## 20. คำสั่งที่ควรระวัง

ตรวจ target, branch และ `git status` ก่อนใช้คำสั่งต่อไปนี้:

| คำสั่ง                 | ความเสี่ยง                          |
| ---------------------- | ----------------------------------- |
| `git restore FILE`     | ทิ้งการแก้ที่ยังไม่ commit          |
| `git reset --hard`     | ทิ้ง tracked changes และย้าย branch |
| `git clean -fd`        | ลบ untracked files/directories      |
| `git push --force`     | เขียนทับ remote history             |
| `git branch -D`        | ลบ branch แม้ยังไม่ merge           |
| `git stash drop/clear` | ลบ stash ที่กู้คืนยาก               |

สำหรับ shared branches:

- ใช้ `git revert` แทนการ rewrite history
- ใช้ `git push --force-with-lease` เฉพาะ feature branch ที่จำเป็น
- ห้าม force push `main`
- อย่าใช้ `git reset --hard` หรือ `git clean -fd` เพียงเพื่อทำให้ working tree สะอาดโดยไม่ตรวจสิ่งที่จะสูญหาย

## Quick reference

| งาน                 | คำสั่ง                                   |
| ------------------- | ---------------------------------------- |
| ดูสถานะ             | `git status --short`                     |
| ดู branch ปัจจุบัน  | `git branch --show-current`              |
| อัปเดต remote state | `git fetch origin`                       |
| อัปเดต `main`       | `git pull --ff-only origin main`         |
| สร้าง branch        | `git switch -c feature/add-health-check` |
| ดู diff             | `git diff`                               |
| ตรวจ whitespace     | `git diff --check`                       |
| Stage ไฟล์          | `git add FILE`                           |
| Commit              | `git commit -m "docs: update guide"`     |
| Push ครั้งแรก       | `git push -u origin BRANCH_NAME`         |
| ดู PR commits       | `git log --oneline origin/main..HEAD`    |
| ย้อน shared commit  | `git revert COMMIT_SHA`                  |
| ดู recovery history | `git reflog`                             |

## เอกสารที่เกี่ยวข้อง

- [คู่มือ CI](./CI_GUIDE.md)
- [คู่มือตั้ง Branch Protection Ruleset](./BRANCH_PROTECTION_RULESET.md)
