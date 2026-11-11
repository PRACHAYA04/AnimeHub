# เทียบเกณฑ์ Term Project BE–FE

เป้าหมายคือมีหลักฐานครบ ไม่ใช่รับประกันคะแนนเต็ม. อ้างอิงภาพเกณฑ์ที่ผู้ใช้ส่ง

| หัวข้อ | คะแนน | ผลงานในชุดนี้ | หลักฐานที่ต้องถ่าย/ตรวจหลัง Deploy |
|---|---:|---|---|
| Tech Stack / Deploy | 2 | ใช้ stack เดิม, config/คู่มือ Vercel/Render/Supabase | URL จริง FE/BE/DB และ commit ล่าสุด ยังต้องตั้งบัญชีทีม |
| ระบบสมาชิก | 2 | Register, Login/Logout, Profile, password, token revocation | ทำครบผ่าน browser บนโดเมนจริง |
| Guest / Member / Admin | 4 | Public catalog, member review/vote/wishlist, owner edit, admin CRUD/role/moderation | แสดงทั้งการใช้งานสำเร็จและ 401/403/404 จาก API โดยตรง |
| API / Database / UI | 2 | React fetch → Go → PostgreSQL, Jikan importer, UI loading/empty/error | รีวิว/คะแนนคงอยู่หลัง reload, API failure แสดง error, DB มีข้อมูล |
| React Unit Test | 1 | 15 assertions ผ่านใน 5 suites: api wrapper, form, catalog, guards, admin confirmation | npm test และ GitHub Actions ของทีม |
| Project Structure | 2 | frontend pages/components/api/auth, backend handler/store/mw/auth | เปิดโค้ดและอธิบายหน้าที่/เส้นทางข้อมูล |
| สาธิตระบบในคลิป | 2 | แผนเดโมใน DEMO.md | ต้องบันทึกระบบ Deploy จริง |
| โค้ดและเส้นทางข้อมูลรายบุคคล | 3 | API.md, โค้ดแยกหน้าที่ | แต่ละคนอธิบายโค้ดที่ตนรับผิดชอบจริง พร้อมระบุชื่อ |
| เหตุผลและการแก้ปัญหารายบุคคล | 2 | มีปัญหาที่สังเกตจริงใน VERIFICATION.md | ผู้เรียนต้องเข้าใจและอธิบายเอง ห้ามอ้างว่าพบ/แก้ด้วยตนเองหากไม่จริง |

คะแนนกลุ่ม 13 + สาธิตทีม 2 + อธิบายรายบุคคล 5 = 20. คลิปไม่เกิน 15 นาที ทีม 2 คน (บางทีม 3 คน) ตามภาพเกณฑ์

## ก่อนส่ง

1. อ่านและลองแก้ไขโค้ดด้วยตัวเองจนเล่าได้ ไม่ใช้คลิปอ่านตาม script โดยไม่เข้าใจ
2. ใช้บัญชีทดสอบสองคนพิสูจน์ว่าคน B แก้รีวิว/Wishlist ของ A ไม่ได้
3. ตรวจ Actions บน GitHub จริง ไม่ถือว่ารันในเครื่องผ่านแล้ว Actions จะผ่านโดยอัตโนมัติ
4. ระบุชัดว่าข้อมูลตั้งต้นเป็น snapshot ของ Jikan ผ่าน archive และการดึงสดครั้งนี้ยัง timeout; ลอง fetch-jikan บนเครือข่ายทีมก่อนสาธิต
5. ตรวจสิทธิ์ภาพ/ที่มาและไม่อ้างว่าเป็นพันธมิตรหรือ API ทางการของ MyAnimeList
