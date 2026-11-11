# ขึ้นออนไลน์บนบัญชีของทีม

เอกสารนี้เตรียมขั้นตอนเท่านั้น ยังไม่ได้สร้างทรัพยากรหรือ Deploy จริง

## 1. Repository

แนะนำหนึ่ง repository ที่มี frontend/ และ backend/ ตามแพ็กเกจนี้ workflow รากรันสอง job แยกกัน. หากผู้สอนต้องการสอง repo ให้แยกสองโฟลเดอร์และใช้ workflow ที่อยู่ในแต่ละโฟลเดอร์ (`frontend/.github/workflows/test.yml`, `backend/.github/workflows/test.yml`) แทน workflow ราก

ตรวจว่าไม่มี `.env`, `.env.local`, database URL/password, JWT secret, node_modules, build หรือไฟล์ executable ใน commit

## 2. Supabase PostgreSQL

1. สร้าง project ด้วยบัญชีทีม แล้วคัดลอก PostgreSQL connection string จาก Connect
2. Go เชื่อม PostgreSQL ผ่าน pgxpool โดยตรง ไม่ใช้ Supabase Auth หรือ browser Data API
3. ถ้าเครื่อง/Render ไม่มี IPv6 ให้ใช้ **Session pooler** ที่รองรับ IPv4 และ prepared statements คัดลอก username/hostname/port ตาม dashboard จริง ไม่เดาจากตัวอย่าง
4. ใช้ `sslmode=require` สำหรับฐานข้อมูลออนไลน์ และ URL-encode password. ถ้าต้องการยืนยัน certificate ด้วยให้ตั้ง root cert ตามเอกสาร Supabase
5. ตั้ง DATABASE_URL เฉพาะ backend/shell แล้วรัน `go run . init` และ `go run . seed` จาก backend เพื่อสร้างตารางและนำเข้า 50 เรื่อง ตรวจจำนวนใน SQL Editor
6. ตารางนี้ออกแบบให้ผ่าน Go เท่านั้น: ไม่ให้ browser ใช้ database credentials/service-role key. หากเปิด Supabase Data API ต้องปิด public access หรือกำหนด RLS/privileges ให้เหมาะสมก่อนเผยแพร่ ไม่ใช่ถือว่าการซ่อน key ฝั่ง React ป้องกันได้

อ้างอิง: https://supabase.com/docs/guides/database/connecting-to-postgres

## 3. Render Backend

สร้าง Web Service จาก repo แล้วตั้ง:

| Setting | ค่า |
|---|---|
| Runtime | Go |
| Root Directory | backend (เว้นว่างถ้าเป็น repo เฉพาะ Backend) |
| Build Command | `go build -o animehub .` |
| Start Command | `./animehub` |
| Health Check | `/api/health` |
| Go version | ให้ตรง go.mod: 1.27.1 หรือรุ่นที่ใหม่กว่าและรองรับ dependencies เดิม |

Environment: DATABASE_URL, JWT_SECRET (สุ่มอย่างน้อย 32 ไบต์), ALLOWED_ORIGINS (Vercel origin จริง ไม่มี slash ท้าย; หลาย origin คั่น comma). ใช้ PORT ที่ Render จัดให้ ตัวโปรแกรมอ่านแล้ว bind ทุก interface

การ init/seed รันหนึ่งครั้งจากเครื่องที่เข้าถึง DB ได้ ไม่ใส่คำสั่ง promote หรือรหัส Admin ใน Build Command

ตรวจ `/api/health` ได้ `{"status":"ok"}` และ `/api/anime` มี items ก่อนต่อ Frontend

อ้างอิง: https://render.com/docs/deploy-go-nethttp และ https://render.com/docs/monorepo-support

## 4. Vercel Frontend

Import repo ตั้ง Root Directory เป็น frontend (หรือว่างถ้าแยก repo), Framework Preset: Create React App, Build Command: `npm run build`, Output Directory: `build`, Install Command: `npm ci`

ตั้ง `REACT_APP_API_URL=https://YOUR-SERVICE.onrender.com` โดยไม่มี /api ต่อท้าย แล้ว Deploy. ตัวแปรนี้เป็น URL สาธารณะ ไม่ใช่ค่าลับ ห้ามใส่ DATABASE_URL/JWT_SECRET ในตัวแปร REACT_APP_

ไฟล์ vercel.json มี SPA rewrite เพื่อ refresh /anime/1 หรือ /admin แล้วไม่ 404. เมื่อเปลี่ยน environment ต้อง build/deploy ใหม่

อ้างอิง: https://vercel.com/docs/frameworks/frontend/create-react-app และ https://vercel.com/docs/environment-variables

## 5. Admin และตรวจหลัง Deploy

- สมัครบัญชีจริงผ่านเว็บ จาก backend shell ที่ตั้ง DATABASE_URL ของ Supabase: `go run . promote your-email@example.com`
- login ใหม่แล้วเห็นหลังบ้าน เพิ่มอนิเมะทดลอง แก้ชื่อ แล้วดูหน้า public ว่าข้อมูลตรงกัน
- ใช้บัญชี Member เปิด /admin ต้องเห็น 403 และยิง API โดยตรงต้องได้ 403 เช่นกัน
- ทดสอบ Profile/password, รีวิวแก้/ลบ, คะแนน, Wishlist และ persistence หลัง refresh
- บันทึก URL จริงและ Actions run ของ commit ล่าสุดในเอกสารส่งงาน ไม่มี URL ปลอมในแพ็กเกจนี้
- ถ้าใช้แผนบริการที่พักเครื่องเมื่อไม่ได้ใช้งาน ให้เปิด health/API และรอพร้อมก่อนบันทึกคลิป

## ข้อมูลที่ยังต้องใช้จากผู้ใช้

บัญชี/สิทธิ์ GitHub, Vercel, Render, Supabase และ connection string/secret ที่กรอกในช่องตั้งค่าของบริการโดยตรง. ไม่ส่ง password หรือ JWT secret เป็นข้อความในแชต
