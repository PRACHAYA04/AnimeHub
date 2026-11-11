# API contract

Base: Go server เช่น http://localhost:8080. JSON camelCase. Header สำหรับสมาชิก `Authorization: Bearer <token>`. ไม่ส่ง memberId หรือ role เพื่อขอสิทธิ์

Response error: `{"error":{"message":"ข้อความ"}}`. 400 validation, 401 missing/expired/revoked token, 403 insufficient role, 404 not found/not owner, 409 duplicate/conflict, 500 internal. DELETE สำเร็จตอบ 204 ไม่มี body

| Method | Path | สิทธิ์ / body / response |
|---|---|---|
| GET | /api/health | Public, database health |
| POST | /api/auth/register | Public `{email,password,displayName}` → 201 member |
| POST | /api/auth/login | Public `{email,password}` → `{token,member}` |
| POST | /api/auth/logout | Member → 204, revoke all account sessions |
| GET | /api/me | Member → member |
| PUT | /api/me | Member `{displayName,bio}` → member; email/role ไม่เปลี่ยน |
| PUT | /api/me/password | Member `{currentPassword,newPassword}` → 204/revoke sessions |
| GET | /api/anime?q=&genre= | Public → `{items:[...]}` |
| GET | /api/anime/{id} | Public → anime object |
| GET | /api/genres | Public → `{items:["Drama",...]}` |
| GET | /api/anime/{id}/reviews | Public → `{items:[...]}` |
| POST | /api/anime/{id}/reviews | Member `{text}` → 201 `{id,text}`; 10–5000 Unicode characters |
| PUT | /api/reviews/{id} | Owner only `{text}` → `{id,text}` |
| DELETE | /api/reviews/{id} | Owner or Admin → 204 |
| PUT | /api/anime/{id}/vote | Member `{score:1..10}` → `{animeId,score}`; replaces own vote |
| DELETE | /api/anime/{id}/vote | Member → 204 |
| GET | /api/anime/{id}/mine | Member → `{myVote,inWishlist}` |
| GET | /api/me/wishlist | Member → `{items:[anime...]}` ของบัญชีตัวเอง |
| PUT | /api/me/wishlist/{id} | Member → `{animeId}`; idempotent |
| DELETE | /api/me/wishlist/{id} | Member → 204 |
| GET | /api/admin/stats | Admin → aggregate stats, newestMembers, topVoted |
| GET | /api/admin/members | Admin → `{items:[member...]}` ไม่มี password hash |
| PUT | /api/admin/members/{id}/role | Admin `{role:"admin"หรือ"member"}` → member; ห้ามแก้ตนเอง |
| POST | /api/admin/anime | Admin → 201 anime |
| PUT | /api/admin/anime/{id} | Admin → anime |
| DELETE | /api/admin/anime/{id} | Admin → 204; cascade related content |

Anime input: `{title,titleTh,titleJapanese,detail,poster,genres:[],year:nullหรือint,episodes:nullหรือint,status}`. Server ไม่รับ malId/jikanScore จากฟอร์ม Admin. poster เป็น http/https URL. year 1900–2200. episodes >=0

Anime output เพิ่ม `id` (internal PostgreSQL key), `malId` (external unique key), `jikanScore`, `memberRating`, `memberVoteCount`, `sourceUrl`, `syncedAt`, `genre` (แนวแรก). แยก internal ID ออกจาก MAL ID ชัดเจน

Profile จำกัด displayName 1–50 Unicode characters และ bio <=500. Password >=8 Unicode characters และ <=72 UTF-8 bytes. Login ผิดทั้งไม่พบอีเมลและรหัสผิดใช้ข้อความเดียวกัน พร้อม dummy bcrypt comparison

CORS อนุญาต origin ตรงตัวตาม ALLOWED_ORIGINS. OPTIONS ไม่ต้องแนบ token. CORS ไม่แทน authentication
