# builder ติดตั้ง dependencies ทั้งหมดและ compile TypeScript
# ใช้ Node.js 24 บน Alpine Linux เป็น base image และตั้งชื่อ stage ว่า builder
FROM node:24-alpine AS builder

# กำหนด working directory ภายใน container เป็น /app คำสั่งถัดไปจะทำงานจาก directory นี้
WORKDIR /app

# คัดลอกไฟล์ dependency ก่อน แล้วติดตั้ง package ตาม package-lock.json
# npm ci ติดตั้ง version ตาม lock file อย่างแน่นอน
# การ copy เฉพาะ package files ก่อนช่วยใช้ Docker layer cache หาก source code เปลี่ยนแต่ dependency ไม่เปลี่ยน Docker ไม่จำเป็นต้องติดตั้ง package ใหม่
COPY package.json package-lock.json ./
RUN npm ci

# คัดลอก TypeScript configuration และ source code เข้า image และ build
# ผลลัพธ์จะถูก compile ไปที่ /app/dist
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# runner นำเฉพาะไฟล์ที่จำเป็นไปรันจริง
# เริ่ม image ใหม่สำหรับ runtime โดยไม่รับไฟล์และ dependencies จาก builder มาโดยอัตโนมัติ ทำให้แยก build environment ออกจาก production environment
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# ติดตั้งเฉพาะ production dependencies โดยไม่ติดตั้ง devDependencies เช่น TypeScript และ tsx เพราะ application ถูก compile ใน builder stage แล้ว
# หลังติดตั้งเสร็จจะล้าง npm cache เพื่อลดขนาด image
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# คัดลอกเฉพาะผลลัพธ์ที่ compile แล้วจาก builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/locales ./src/locales

# ระบุว่า application ภายใน container ฟังที่ port 8080
EXPOSE 8080

# เรียก TypeORM CLI เพื่อรัน migration ที่ยังไม่เคยใช้งาน โดยใช้ DataSource ที่ compile แล้วใน dist
# เริ่ม production application จาก JavaScript ที่ compile แล้ว
CMD ["sh", "-c", "node ./node_modules/typeorm/cli.js migration:run -d ./dist/data-source-migration.js && exec node dist/index.js"]
