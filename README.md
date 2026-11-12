# AnimeCenter

เว็บค้นหาอนิเมะ รีวิว คะแนน และรายการอยากดู พร้อมระบบผู้ดูแล สำหรับ Term Project BE–FE

เพิ่มระบบแนะนำอนิเมะตามความสนใจที่ `/me/recommendations`: ใช้รายการอยากดูและคะแนนของสมาชิกจัดอันดับเรื่องใหม่ พร้อมเหตุผลที่แนะนำ คำนวณผ่าน Go/PostgreSQL และใช้ตารางเดิมได้เลย ไม่ต้องเปลี่ยน schema. วิธีคิด ตัวอย่าง และแผนสาธิตอยู่ใน [docs/RECOMMENDATIONS.md](docs/RECOMMENDATIONS.md)

## ระบบที่ Deploy แล้ว

| ส่วน | URL | บริการ |
|---|---|---|
| Frontend | https://anime-hub-bice.vercel.app | Vercel |
| Backend API | https://animehub-lrye.onrender.com (ตรวจสถานะที่ `/api/health`) | Render |
| Database | PostgreSQL บน Supabase (เข้าถึงผ่าน Go เท่านั้น) | Supabase |

Render แผนฟรีพักเครื่องเมื่อไม่มีการใช้งาน ให้เปิด `/api/health` รอให้ตอบก่อนสาธิต

## สถานะส่งมอบ

- Source code Frontend/Backend พร้อม schema และข้อมูลจริง 50 เรื่อง
- React unit tests, Go token tests และ integration tests ที่ใช้ HTTP + PostgreSQL จริง
- Deploy แล้วบน Vercel (Frontend), Render (Backend) และ Supabase (PostgreSQL) ตามตารางด้านบน
- GitHub Actions (`.github/workflows/test.yml`) รัน React tests + build และ Go vet/test/build พร้อม PostgreSQL จริงทุกครั้งที่ push
- ข้อมูลตั้งต้นเป็น **สำเนาข้อมูลที่ส่งออกจาก Jikan** ผ่าน archive ที่ระบุใน `backend/data/PROVENANCE.md` ไม่ใช่การดึง Jikan สดสำเร็จในวันที่ส่งงาน เพราะ endpoint สดเชื่อมต่อไม่สำเร็จจากสภาพแวดล้อมนี้
- มีคำสั่ง `fetch-jikan` สำหรับดึงข้อมูลสดโดยจำกัดความถี่และแคชรายวัน และหน้า `/lab` สำหรับทดลองเรียก Jikan โดยตรง
- คะแนนเต็มขึ้นกับการประเมินจริง การ Deploy และการอธิบายของแต่ละคน ไม่รับประกันจากโค้ดอย่างเดียว

## เทคโนโลยี

JavaScript/JSX, React 19, React Router 6, Create React App (`react-scripts`), Tailwind 3, browser fetch, Context/localStorage; Go standard `net/http`, PostgreSQL, pgxpool, JWT HS256, bcrypt. ไม่มี framework หรือ runtime library ใหม่จากตัวอย่างเดิม

คง dependency version จาก ZIP ต้นฉบับ รวมถึง `go 1.27.1`; ใช้ Go 1.27.1 ขึ้นไป และ Node 20 ขึ้นไป แนะนำ PostgreSQL 16 ตาม Docker Compose (ทดสอบในเครื่องนี้กับ PostgreSQL 18.1)

## โครงสร้าง

```text
frontend/src/
  api/          fetch wrapper, Jikan lab, daily cache
  auth/         login session, validate /api/me on refresh
  components/   route guards, UI states, review form
  pages/        catalog, detail, auth, profile, admin, API lab
backend/
  auth/         bcrypt, JWT and forged-token tests
  mw/           login/role/CORS/logging
  handler/      validation, HTTP routes, integration tests
  store/        parameterized PostgreSQL queries and JSON projections
  data/         50-record snapshot and provenance/license
  schema.sql    relational database, constraints and aggregate view
  seed.go       daily external fetch and idempotent import
docs/           API, deployment, verification and demo plan
```

รูปแบบต่อยอดจาก MovieHub: component/props/hooks, API wrapper, AuthContext, loading/error/empty, Guard, admin form/confirmation, Go handler/store/middleware และ parameterized SQL. ออกแบบข้อมูลอนิเมะและ API ใหม่ให้ตรงกัน ไม่มี TMDB key หรือ URL ของทีมเดิมติดมา

## เริ่มใช้งานในเครื่อง (PowerShell)

ติดตั้ง Go, Node/npm, Docker Desktop หรือ PostgreSQL ก่อน คำสั่งต่อไปนี้รันจากโฟลเดอร์ AnimeCenter

### 1. ฐานข้อมูล

```powershell
$env:POSTGRES_PASSWORD = 'ใส่รหัสฐานข้อมูลสำหรับเครื่องคุณ'
docker compose up -d
```

หากมี PostgreSQL อยู่แล้ว สร้าง database ใหม่ชื่อ `animehub` แล้วใช้ connection string ของคุณ ไม่ต้องเปิด Docker ซ้ำ

### 2. ตั้งค่า Backend และสร้างตาราง

Go ไม่โหลด `.env` เอง: `backend/.env.example` เป็นแบบฟอร์มอ้างอิง ให้ตั้ง environment จริงใน shell หรือใน Render

```powershell
cd backend
$env:DATABASE_URL = 'postgres://animehub:YOUR_URL_ENCODED_PASSWORD@localhost:5432/animehub?sslmode=disable'
$env:JWT_SECRET = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$env:ALLOWED_ORIGINS = 'http://localhost:3000'
$env:PORT = '8080'
go mod download
go run . init
go run . seed
go run .
```

ใช้ secret เดิมเมื่อเปิด shell ใหม่ ถ้าต้องการให้ token เดิมยังใช้ได้ เก็บค่าลับไว้ในตัวจัดการ environment ของคุณ ห้าม commit. URL-encode ตัวอักษรพิเศษใน password ของ DATABASE_URL

`init` สร้างตารางถ้ายังไม่มี เป็น schema สำหรับติดตั้งใหม่ ไม่ใช่ migration engine สำหรับ schema รุ่นอื่น

`seed` นำเข้าจากไฟล์ snapshot แบบ transaction ใช้ `mal_id` unique และ `ON CONFLICT DO NOTHING` รันซ้ำไม่เพิ่มข้อมูลซ้ำและไม่ทับการแก้ไขของ Admin

### 3. Frontend (อีก terminal)

```powershell
cd frontend
npm ci
npm start
```

เปิด `http://localhost:3000` ค่า `REACT_APP_API_URL` ว่างจะใช้ development proxy ไป Go ที่ 8080. ถ้าตั้ง `.env.local` ต้อง restart dev server

### 4. สร้าง Admin คนแรก

สมัครบัญชีผ่านเว็บก่อน จาก terminal ที่ตั้ง DATABASE_URL แล้ว:

```powershell
cd backend
go run . promote your-email@example.com
```

ออกและเข้าใหม่ จากนั้นใช้หลังบ้านเลื่อนบทบาทสมาชิกคนอื่น ไม่มีบัญชี/รหัสผ่าน Admin ฝังใน source. ห้ามแก้ role ตัวเองผ่าน API

## ดึงข้อมูล Jikan สด

```powershell
cd backend
go run . fetch-jikan
go run . seed
```

ดึง 2 หน้า หน้าละ 25 เรื่องแบบต่อเนื่อง เว้นอย่างน้อยหนึ่งวินาที แคชวัน UTC เดียวกัน ไม่วนทุกครั้งที่เปิดเว็บ หากดึงไม่สำเร็จไฟล์เดิมไม่ถูกแทนที่. API ภายนอกอาจเปลี่ยนแปลง/ไม่พร้อม จึงให้หน้าหลักอ่านสำเนาฐานข้อมูลผ่าน Go

`seed` เพิ่มเฉพาะ MAL ID ใหม่ ไม่อัปเดตคะแนน/ข้อความของรายการเดิมอัตโนมัติ เพื่อไม่ลบการแก้ไขของ Admin. การ sync รายการเดิมตามเวลาไม่ได้อยู่ในรุ่นนี้

## การใช้งานและสิทธิ์

- Guest: ดู/ค้นหา/กรอง/อ่านรีวิว
- Member: Profile/password, รีวิวหนึ่งครั้งต่อเรื่อง, แก้/ลบเฉพาะรีวิวตน, vote 1–10, Wishlist ส่วนตัว
- Admin: เพิ่ม/แก้/ลบอนิเมะในฐานข้อมูล, Dashboard, สมาชิกและบทบาท, ลบรีวิวที่ไม่เหมาะสมผ่านหน้ารายละเอียด
- Admin ไม่สามารถเขียนทับรีวิวของคนอื่น; การลบอนิเมะ cascade รีวิว/คะแนน/Wishlist และ UI ขอให้ยืนยันก่อน
- หน้าจอซ่อนปุ่มเป็น UX; Go บังคับสิทธิ์จริงและอ่าน member/role/token_version ล่าสุดจาก DB ทุก request ที่ login
- Logout ยกเลิก token ทั้งบัญชี; เปลี่ยน password หรือ role ก็ทำให้ token เดิมใช้ไม่ได้ทันที และต้อง login ใหม่
- คะแนน `jikanScore` คือคะแนนต้นทาง ส่วน `memberRating` คำนวณจาก votes ของเว็บ ห้ามปะปนกัน

## ทดสอบ

```powershell
cd frontend
npm test -- --watchAll=false --runInBand
npm run build
```

```powershell
cd backend
$env:TEST_DATABASE_URL = 'postgres://YOUR_TEST_USER:YOUR_PASSWORD@localhost:5432/animehub_test?sslmode=disable'
go test ./... -v -count=1
go vet ./...
go build .
```

Integration test สร้าง schema ชั่วคราวชื่อ `animehub_test_*` แล้วลบทิ้ง ใช้ฐานข้อมูลทดสอบและ user ที่มีสิทธิ์ CREATE SCHEMA. หากไม่ตั้ง TEST_DATABASE_URL จะขึ้น SKIP ไม่ใช่ทดสอบผ่านครบ. GitHub Actions ตั้ง PostgreSQL 16 และ TEST_DATABASE_URL ให้อัตโนมัติ ดูผลได้ที่แท็บ Actions ของ repository

## Deploy และคลิป

อ่าน `docs/DEPLOYMENT.md`, `docs/RUBRIC.md`, `docs/DEMO.md` และ `docs/API.md`. อย่าส่งงานโดยระบุ GitHub Actions เขียวจนกว่าจะ push และตรวจผลใน repository ของตนจริง
