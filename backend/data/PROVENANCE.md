# ข้อมูลตั้งต้นและข้อจำกัด

ไฟล์ jikan.json มีอนิเมะจริง 50 เรื่องจากรายการฤดูใบไม้ผลิ 2025 ที่เก็บโดยโครงการ anime-stats-tracker ซึ่งใช้ Jikan API ตาม fetch_anime.py ของโครงการนั้น

- แหล่งสำเนาแบบ pin commit: https://github.com/zyhe16/anime-stats-tracker/blob/fb309e5cc198691ff25a93429a98f06d66b30dee/data/2025/spring.json
- โปรแกรมส่งออกของต้นทาง: https://github.com/zyhe16/anime-stats-tracker/blob/fb309e5cc198691ff25a93429a98f06d66b30dee/fetch_anime.py
- ใบอนุญาตโครงการ archive: ดู ARCHIVE-LICENSE.txt (MIT). สิทธิ์ในภาพ/เนื้อหาของ MyAnimeList ยังคงเป็นของเจ้าของ ไม่ได้โอนตาม MIT ของโปรแกรม
- ดาวน์โหลดสำเนาเพื่อ bootstrap: 11 พฤศจิกายน 2026
- `fetchedAt` ใน snapshot นี้ใช้เวลา commit ของไฟล์ archive ไม่ใช่หลักฐานเวลาที่ Jikan ตรวจต้นทางจริง และไม่ใช่ข้อมูลสดในวันส่งมอบ
- เลือกเฉพาะรายการที่ไม่ถูกระบุ is_hentai มีชื่อ รูป และเรื่องย่อ เรียงคะแนนแล้วเลือก 50 รายการ; ไม่มีข้อมูลสมาชิกหรือรีวิวของคนอื่นนำเข้ามา
- แปลงเฉพาะชื่อ field ให้เป็นรูปแบบ Jikan ที่ตัว importer ใช้ ไม่สร้างชื่อ เรื่องย่อ คะแนน หรือรูปขึ้นเอง

ระหว่างจัดทำได้ลองเรียก api.jikan.moe หลาย endpoint แต่เชื่อมต่อ timeout จึงไม่ได้อ้างว่าดึงข้อมูลสดสำเร็จ และไม่ได้เพิ่ม API สำรองอื่นเข้าแอป

รัน `go run . fetch-jikan` เมื่อเชื่อมต่อ Jikan ได้ เพื่อแทนไฟล์ snapshot ด้วยผล API โดยตรง แล้ว `go run . seed` เพื่อเพิ่ม MAL ID ที่ยังไม่มีอยู่ (ไม่ทับรายการเดิม). หน้า /lab ใช้ Jikan โดยตรงและแจ้ง error หากเรียกไม่ได้

เอกสาร API: https://docs.api.jikan.moe/
