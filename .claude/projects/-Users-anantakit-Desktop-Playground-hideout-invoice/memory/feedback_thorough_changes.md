---
name: thorough-changes
description: When making changes, apply consistently across the entire codebase — don't fix one file and leave others with the same issue
type: feedback
---

เวลาแก้ไขอะไร ต้องไล่ดูและแก้ให้ครบทุกที่ในครั้งเดียว ไม่ใช่แก้แค่ไฟล์เดียวแล้วทิ้งที่เหลือให้ user ต้องมาถามเพิ่ม

**Why:** user ต้องมาถามซ้ำว่า "ทำไมมีแค่ booking แก้ log" — เสียเวลาทั้งสองฝ่าย ควร grep หาทุกที่ที่มีปัญหาเดียวกันแล้วแก้หมดในรอบเดียว

**How to apply:** ก่อนถือว่าเสร็จ ต้อง:
1. Grep/search หา pattern เดียวกันทั้ง codebase
2. แก้ทุกที่ที่เกี่ยวข้อง ไม่ใช่แค่ที่เจอตัวแรก
3. ถ้าบาง instance ไม่ต้องแก้ (เช่น startup code ไม่มี context) ให้อธิบายเหตุผลเอง ไม่ต้องรอ user ถาม
