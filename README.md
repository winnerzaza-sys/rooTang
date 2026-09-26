# รู้ทาง

Mobile-first PWA สำหรับค้นหาเส้นทางและดูรายงานเหตุการณ์จาก Longdo/iTIC และ Traffy Fondue

## Local modes

- `VITE_DATA_MODE=mock` ใช้ข้อมูล deterministic โดยไม่เรียกบริการภายนอก
- `VITE_DATA_MODE=production` ใช้ Google adapters และ `/api/v1/incidents`

คัดลอก `.env.example` เป็น `.env.local` แล้วเพิ่มค่าของตนเอง ห้าม commit credentials จริง ค่า `VITE_*` ถูกส่งไป browser และไม่ใช่ secret

Google browser key ต้องจำกัดด้วย HTTP referrers และ API restrictions ให้ใช้ได้เฉพาะ:

- Maps JavaScript API
- Routes API
- Places API (New)

ตั้ง `VITE_GOOGLE_MAP_ID` สำหรับ production map styling. หากไม่มี key แอปจะแสดงสถานะตั้งค่าที่ลองใหม่ได้

Vite เพียงอย่างเดียวไม่จำลอง Vercel Functions ใช้ Vercel development runtime เมื่อต้องทดสอบ `/api/v1/incidents` แบบ local หรือใช้ mock mode สำหรับ UI และ automated tests

## Server environment

| Variable                         | Default | ใช้ทำอะไร                                                          |
| -------------------------------- | ------: | ------------------------------------------------------------------ |
| `INCIDENT_MAX_BBOX_DEGREES`      |     `5` | ขนาด bounding box สูงสุด (องศา) ค่าไม่ถูกต้องจะกลับเป็นค่าเริ่มต้น |
| `INCIDENT_PROVIDER_TIMEOUT_MS`   |  `8000` | timeout ต่อ provider (จำกัด 1–20 วินาที)                           |
| `INCIDENT_RATE_LIMIT_PER_MINUTE` |    `60` | จำกัดคำขอต่อ client ต่อนาที ภายใน instance เดียว (ไม่ใช่ global)   |

## Deployment (Vercel)

`vercel.json` กำหนด build, SPA rewrites (ยกเว้น `/api/`), security headers และ cache headers ของ `sw.js`/`index.html`/assets

- ตั้งค่า `VITE_*` และตัวแปร server ใน Vercel project settings ห้าม commit ค่าจริง
- CSP ยังเป็น `Content-Security-Policy-Report-Only` ต้องตรวจกับแผนที่จริงใน preview ก่อนเปลี่ยนเป็น enforce
- rate limit ใน function เป็นแบบต่อ instance ควรตั้ง Vercel Firewall rate-limit rule สำหรับ `/api/v1/incidents`
- relative imports ฝั่ง `api/` และ `server/` ต้องมีนามสกุล `.js` เพราะ package เป็น ESM

ดู blockers ก่อน production ใน [RELEASE_READINESS.md](RELEASE_READINESS.md)

## Commands

```sh
npm run dev
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Automated tests บังคับใช้ mock/intercepted data และไม่เรียก Google, Longdo หรือ Traffy แบบ live

Playwright projects: `mobile-chromium`, `desktop-chromium`, `mobile-webkit` (mock mode บน dev server) และ `pwa-production-build`, `pwa-production-build-webkit` (production build ใน `dist-e2e/` โดยไม่มี Google key และ intercept `/api`) ต้องติดตั้ง browser ด้วย `npx playwright install chromium webkit`
