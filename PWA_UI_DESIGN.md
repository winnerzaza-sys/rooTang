# รู้ทาง — PWA UI Design Specification

> เอกสารนี้เป็น source of truth สำหรับการ implement UI/UX ของ PWA **“รู้ทาง”** ใน Codex
>
> เป้าหมายของ MVP: ให้ผู้ใช้เปิดเว็บแล้วสามารถ
>
> 1. ดูเหตุการณ์จาก **Traffy Fondue** และ **Longdo/iTIC** บนแผนที่
> 2. ค้นหาเส้นทางจากต้นทางไปปลายทาง แล้วเห็นว่า **ระหว่างทางจะเจอเหตุการณ์อะไรบ้าง**
> 3. เปิดเมนู **“ใกล้ฉัน”** เพื่อดู Feed เหตุการณ์รอบตำแหน่งปัจจุบัน
>
> MVP นี้ **ยังไม่ต้องมี Qwen, Login, Push Notification, ประวัติการเดินทาง หรือระบบรายงานเหตุการณ์เอง**

---

## 1. Product identity

- App name: **รู้ทาง**
- Product description: **ดูเหตุการณ์ก่อนออกเดินทาง**
- Platform: **Mobile-first PWA**
- Primary language: **Thai**
- Secondary language support: สามารถเตรียมโครงไว้สำหรับ English แต่ MVP ใช้ภาษาไทย

### Typography

ใช้ Google Fonts:

- **Prompt** — ใช้กับ Heading, Navigation label, Button label, ETA, ตัวเลขสำคัญ และชื่อสถานะ
- **Sarabun** — ใช้กับ Body text, Description, Metadata, เวลา, ระยะทาง และข้อความอธิบาย

```css
:root {
  --font-heading: 'Prompt', system-ui, sans-serif;
  --font-body: 'Sarabun', system-ui, sans-serif;
}
```

ห้ามใช้ Prompt กับ body paragraph ยาว ๆ และห้ามใช้ Sarabun กับตัวเลข ETA หลัก

---

## 2. Design direction

ดีไซน์ต้องให้ความรู้สึก:

- สะอาด
- อ่านง่ายบนมือถือ
- Map-first
- ทันสมัย แต่ไม่ตกแต่งเยอะเกินไป
- มองข้อมูลสำคัญออกภายใน 1–2 วินาที
- ใช้สีเพื่อแยกประเภทเหตุการณ์ แต่ไม่ใช้สีเป็นวิธีสื่อความหมายเพียงอย่างเดียว

### Visual style

- พื้นหลังหลัก: off-white / light neutral
- Surface: white หรือ translucent white
- Primary: deep blue / indigo
- Accent: cyan / sky blue
- Warning: amber
- Danger: red
- Success / clear route: green
- Border: neutral gray โปร่งบาง
- Shadow: เบาและฟุ้ง ไม่ใช้ drop shadow หนัก
- Corner radius: 16–24 px สำหรับ card, 999 px สำหรับ pill/chip

ตัวอย่าง token:

```css
:root {
  --bg: #f6f8fb;
  --surface: rgba(255, 255, 255, 0.92);
  --surface-solid: #ffffff;
  --text-primary: #0f172a;
  --text-secondary: #64748b;
  --border: #e2e8f0;
  --primary: #2563eb;
  --primary-dark: #1d4ed8;
  --info: #0ea5e9;
  --success: #16a34a;
  --warning: #f59e0b;
  --danger: #ef4444;
}
```

หากโปรเจกต์มี design token อยู่แล้ว ให้ map token เดิมเข้ากับ role ด้านบนแทนการ hard-code สีใน component

---

## 3. Information architecture

MVP มี navigation หลักเพียง **2 เมนู**

1. **แผนที่**
2. **ใกล้ฉัน**

ใช้ bottom navigation แบบ fixed บน mobile

```text
┌──────────────────────────────┐
│                              │
│          App content         │
│                              │
├──────────────────────────────┤
│   🗺 แผนที่      ◎ ใกล้ฉัน   │
└──────────────────────────────┘
```

กฎ:

- Bottom bar สูงประมาณ 68–76 px รวม safe area
- Icon + label ต้องแสดงพร้อมกัน
- Active tab ใช้ primary color และ surface/pill เบา ๆ
- ห้ามเพิ่ม tab อื่นใน MVP

---

# 4. Screen A — แผนที่ / Route Search

## 4.1 Default state

เปิดแอปแล้วผู้ใช้ต้องเห็นแผนที่เป็นสิ่งหลักทันที

Layout:

```text
┌──────────────────────────────┐
│ รู้ทาง               [Locate]│
│ ดูเหตุการณ์ก่อนออกเดินทาง    │
│                              │
│ ┌──────────────────────────┐ │
│ │ ● ตำแหน่งปัจจุบัน       │ │
│ │ ──────────────────────── │ │
│ │ ○ จะไปที่ไหน?           │ │
│ └──────────────────────────┘ │
│                              │
│       MAP — FULL AREA        │
│      • incident markers      │
│                              │
│                        [◎]   │
│                              │
├──────────────────────────────┤
│   🗺 แผนที่      ◎ ใกล้ฉัน   │
└──────────────────────────────┘
```

### Header

- ชื่อ **รู้ทาง** ใช้ Prompt 22–24 px / semibold
- Subtitle “ดูเหตุการณ์ก่อนออกเดินทาง” ใช้ Sarabun 13–14 px
- ปุ่ม locate current location เป็น icon button 44–48 px
- Header overlay แผนที่ได้ แต่ต้องมี contrast อ่านง่าย

### Route Search Card

วางด้านบนของแผนที่ ห่าง safe area พอสมควร

ประกอบด้วย:

- Origin
  - default: `ตำแหน่งปัจจุบัน`
  - สามารถแก้ไขภายหลังได้
- Destination
  - placeholder: `จะไปที่ไหน?`
- Swap origin/destination ยังไม่จำเป็นใน MVP
- เมื่อ destination พร้อม ให้แสดงปุ่ม CTA:
  - **ค้นหาเส้นทาง**

Search card:

- Radius 20–24 px
- white / glass-like surface
- subtle border
- width: viewport - 32 px
- minimum tap target 48 px

---

## 4.2 Incident markers

เหตุการณ์จาก Traffy Fondue และ Longdo/iTIC ต้องถูก normalize ก่อนแสดง

### Marker category

| Category             | Visual                   | ตัวอย่าง                   |
| -------------------- | ------------------------ | -------------------------- |
| น้ำท่วม              | blue droplet / wave      | น้ำท่วม, น้ำขัง            |
| อุบัติเหตุ           | red warning / collision  | รถชน, อุบัติเหตุ           |
| ถนนชำรุด             | amber road / pothole     | หลุม, ถนนทรุด, ผิวถนนเสีย  |
| ก่อสร้าง             | orange construction      | ปิดช่องทาง, งานก่อสร้าง    |
| รถเสีย / สิ่งกีดขวาง | purple / neutral warning | รถเสีย, สิ่งกีดขวาง        |
| อื่น ๆ               | gray info marker         | เหตุที่ยัง classify ไม่ได้ |

### Marker rules

- Marker ต้องอ่านออกแม้ซูมออก
- ไม่ใช้ icon ละเอียดเกินไป
- Selected marker ใหญ่ขึ้นประมาณ 10–15%
- Marker ซ้ำใกล้กันควร cluster เมื่อ zoom ต่ำ
- Source ไม่ต้องแยกด้วยสีหลัก เพราะ category สำคัญกว่า source
- Source แสดงใน detail card ด้วย badge `Traffy` หรือ `Longdo`

---

## 4.3 Marker detail bottom sheet

เมื่อผู้ใช้กด marker เปิด bottom sheet ไม่ควร navigate ไปหน้าใหม่

```text
┌──────────────────────────────┐
│ ⚠ อุบัติเหตุ                │
│ ถนนพระราม 2                  │
│                              │
│ รถชนกีดขวางช่องทางซ้าย...   │
│                              │
│ 1.2 กม. จากคุณ · 18 นาทีที่แล้ว│
│ [Longdo]                     │
│                              │
│ [ปิด]              [ดูเส้นทาง]│
└──────────────────────────────┘
```

แสดง:

- Incident type
- Title
- Short description ไม่เกิน 2–3 บรรทัด
- เวลาเกิด/เวลาอัปเดต
- ระยะห่างจากผู้ใช้ ถ้ามี location permission
- Source badge
- สถานะ active/resolved ถ้ามี

ห้ามแสดง raw JSON หรือข้อความยาวเต็มหน้าจอ

---

# 5. Route search result

เมื่อค้นหาเส้นทางสำเร็จ:

1. วาด selected route polyline
2. Fit camera ให้เห็น route ทั้งหมด
3. Filter incidents เฉพาะที่เกี่ยวข้องกับ route
4. Marker ที่ไม่เกี่ยวข้องกับ route ให้ลด opacity หรือซ่อนใน Route Focus Mode
5. เปิด **Route Summary Bottom Sheet**

## 5.1 Route corridor

UI ไม่ต้องแสดง corridor เป็น polygon

Logic เริ่มต้น:

- ถือว่าเหตุการณ์เกี่ยวข้องกับเส้นทาง เมื่ออยู่ภายในประมาณ `500 m` จาก route polyline
- ค่า corridor ต้องเป็น config ปรับได้ ไม่ hard-codeกระจายใน UI

---

## 5.2 Route Summary Sheet

Collapsed state:

```text
┌──────────────────────────────┐
│ 42 นาที              28 กม. │
│ พบเหตุการณ์ตามทาง 3 จุด      │
│ 🔵 น้ำท่วม 1  🔴 อุบัติเหตุ 1 │
│ 🟠 ถนนชำรุด 1                │
│                         ⌃    │
└──────────────────────────────┘
```

Expanded state:

```text
┌──────────────────────────────┐
│ เส้นทางนี้                   │
│ 42 นาที · 28 กม.             │
│                              │
│ จะเจอระหว่างทาง 3 เหตุการณ์  │
│                              │
│ 1  🔴 อุบัติเหตุ             │
│    ข้างหน้า 3.4 กม.          │
│    รายงาน 18 นาทีที่แล้ว      │
│                              │
│ 2  🔵 น้ำท่วม                │
│    ข้างหน้า 8.1 กม.          │
│    รายงาน 34 นาทีที่แล้ว      │
│                              │
│ 3  🟠 ถนนชำรุด               │
│    ข้างหน้า 13.6 กม.         │
│                              │
│ [ดูทั้งหมดบนแผนที่]           │
└──────────────────────────────┘
```

### Event ordering

ใน Route Summary ต้องเรียงตาม **ลำดับที่จะเจอจากต้นทาง → ปลายทาง** ไม่ใช่เรียงตามเวลาแจ้ง

แต่ละ event row แสดงอย่างมาก:

- icon/category
- title
- distance ahead
- age / updated time
- source badge ขนาดเล็ก

ไม่ต้องมี Risk Score ใน MVP ด่วนนี้

---

## 5.3 No event state

ถ้า route ไม่มีเหตุการณ์ที่ match:

```text
✓ ยังไม่พบเหตุการณ์ที่รายงานตามเส้นทางนี้
ข้อมูลอาจเปลี่ยนแปลงได้ระหว่างเดินทาง
```

ต้องใช้คำว่า **“ยังไม่พบเหตุการณ์ที่รายงาน”**

ห้ามใช้คำว่า:

- ปลอดภัยแน่นอน
- ไม่มีอันตราย
- เส้นทางปลอดภัย 100%

---

# 6. Screen B — “ใกล้ฉัน” Feed

หน้าที่สองเป็น feed สำหรับดูเหตุการณ์ใกล้ current location โดยไม่ต้องค้นหาเส้นทาง

Layout:

```text
┌──────────────────────────────┐
│ ใกล้ฉัน                      │
│ เหตุการณ์รอบตำแหน่งของคุณ    │
│                              │
│ [ทั้งหมด] [น้ำท่วม] [อุบัติเหตุ]│
│ [ถนน] [ก่อสร้าง]             │
│                              │
│ ┌──────────────────────────┐ │
│ │ 🔴 อุบัติเหตุ            │ │
│ │ ถนนกาญจนาภิเษก           │ │
│ │ 850 ม. · 12 นาทีที่แล้ว   │ │
│ │ Longdo              ›    │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ 🔵 น้ำท่วม               │ │
│ │ ซอย...                    │ │
│ │ 1.4 กม. · 25 นาทีที่แล้ว  │ │
│ │ Traffy              ›    │ │
│ └──────────────────────────┘ │
│                              │
├──────────────────────────────┤
│   🗺 แผนที่      ◎ ใกล้ฉัน   │
└──────────────────────────────┘
```

## 6.1 Feed filters

ใช้ horizontal scroll chips

ค่าเริ่มต้น:

- `ทั้งหมด`
- `น้ำท่วม`
- `อุบัติเหตุ`
- `ถนน`
- `ก่อสร้าง`

Optional:

- distance selector: `1 กม. / 3 กม. / 5 กม. / 10 กม.`
- default radius: `5 กม.`

ห้ามทำ filter panel ซับซ้อนใน MVP

---

## 6.2 Feed card

แต่ละ card แสดง:

- Category icon
- Incident title
- Location/address แบบสั้น
- Distance from current location
- Time since report/update
- Source badge
- Chevron หรือ “ดูบนแผนที่”

เมื่อกด card:

1. switch ไป tab แผนที่
2. center map ที่ incident
3. เปิด incident bottom sheet โดยอัตโนมัติ

---

# 7. Location permission UX

ห้ามขอ location permission ทันทีโดยไม่มี context

ก่อน browser permission prompt ให้แสดง soft prompt:

```text
ใช้ตำแหน่งของคุณ

รู้ทางใช้ตำแหน่งเพื่อแสดงเหตุการณ์ใกล้คุณ
และใช้เป็นต้นทางเริ่มต้นในการค้นหาเส้นทาง

[ใช้ตำแหน่งของฉัน]
[ไว้ทีหลัง]
```

ถ้าผู้ใช้ไม่อนุญาต:

- แผนที่ยังเปิดได้
- Search route ยังใช้ได้เมื่อกรอกต้นทางเอง
- แท็บใกล้ฉันแสดง state ให้กรอกพื้นที่/เปิด permission
- ห้าม block ทั้งแอป

---

# 8. Loading / Error / Offline states

## Loading

- Map แสดง skeleton เฉพาะ overlay/card ไม่ใช้ full-screen spinner นาน ๆ
- Feed ใช้ skeleton card 3–4 ใบ
- Route search button แสดง progress + disable double submit

## API partial failure

Traffy และ Longdo เป็นคนละ source

ถ้า source หนึ่งล่ม อีก source ยังต้องแสดงได้

ตัวอย่าง:

```text
ข้อมูลบางส่วนอาจไม่ครบ
ไม่สามารถโหลด Traffy ได้ในขณะนี้
```

ห้ามเปลี่ยนทั้งหน้าเป็น fatal error เมื่อ API แค่หนึ่งตัวล่ม

## Offline

PWA shell ควรเปิดได้

แสดง banner:

```text
ออฟไลน์ — กำลังแสดงข้อมูลล่าสุดที่มีอยู่
```

ห้ามบอกข้อมูล cached ว่าเป็นข้อมูลปัจจุบัน

---

# 9. Mobile interaction rules

เนื่องจากแอปถูกออกแบบให้เช็กข้อมูลก่อน/ระหว่างการเดินทาง UI ต้องอ่านง่ายมาก

- Minimum touch target: `48 x 48 px`
- Body text: `>= 16 px`
- Metadata: `>= 13 px`
- ETA: `24–30 px`
- Heading: `20–24 px`
- ห้ามใช้ paragraph ยาวบน map overlay
- Bottom sheet ต้องลากขึ้น/ลงได้
- Map controls ต้องอยู่เหนือ bottom navigation และ safe area
- อย่าวางปุ่มสำคัญชิดขอบจอ
- Avoid hover-only interaction เพราะ mobile-first

---

# 10. Desktop / tablet behavior

PWA ต้องใช้งานบน desktop ได้ แต่ mobile เป็น priority

ที่ viewport >= 900 px:

```text
┌────────────────────────────────────────────┐
│ Sidebar 360–420px │        Map             │
│                   │                        │
│ Search / Feed     │                        │
│ Incident list     │                        │
│                   │                        │
└────────────────────────────────────────────┘
```

- แทน bottom sheet ด้วย side panel
- map ใช้พื้นที่ที่เหลือ
- navigation 2 เมนูสามารถอยู่บน sidebar ด้านบน
- ไม่ต้องสร้าง desktop UI ใหม่คนละระบบ

---

# 11. Recommended component structure

หากใช้ React + TypeScript ให้แบ่ง component ประมาณนี้:

```text
src/
├── app/
│   ├── App.tsx
│   └── router.tsx
├── components/
│   ├── AppHeader.tsx
│   ├── BottomNavigation.tsx
│   ├── CategoryChip.tsx
│   ├── EmptyState.tsx
│   ├── ErrorBanner.tsx
│   └── SourceBadge.tsx
├── features/
│   ├── map/
│   │   ├── MapScreen.tsx
│   │   ├── IncidentMarker.tsx
│   │   ├── IncidentCluster.tsx
│   │   └── MapControls.tsx
│   ├── route/
│   │   ├── RouteSearchCard.tsx
│   │   ├── RoutePolyline.tsx
│   │   ├── RouteSummarySheet.tsx
│   │   └── RouteIncidentRow.tsx
│   ├── incidents/
│   │   ├── IncidentBottomSheet.tsx
│   │   ├── IncidentCard.tsx
│   │   └── incidentTypes.ts
│   └── nearby/
│       ├── NearbyScreen.tsx
│       ├── NearbyFilters.tsx
│       └── NearbyFeed.tsx
├── services/
├── hooks/
├── stores/
├── styles/
└── types/
```

ถ้า codebase เดิมมีโครงสร้างอยู่แล้ว ให้รักษา architecture เดิมและ map component ตาม responsibility นี้ ห้ามย้ายไฟล์ครั้งใหญ่โดยไม่มีเหตุผล

---

# 12. Shared TypeScript model

UI ควร consume normalized model เดียว ไม่อ่าน response ดิบของ Traffy / Longdo โดยตรง

```ts
export type IncidentCategory =
  | 'flood'
  | 'accident'
  | 'road_damage'
  | 'construction'
  | 'obstruction'
  | 'other';

export type IncidentSource = 'traffy' | 'longdo';

export interface Incident {
  id: string;
  source: IncidentSource;
  category: IncidentCategory;
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  reportedAt?: string;
  updatedAt?: string;
  status?: 'active' | 'resolved' | 'unknown';
  distanceFromUserMeters?: number;
  distanceAlongRouteMeters?: number;
}
```

Route result:

```ts
export interface RouteAnalysis {
  routeId: string;
  durationMinutes: number;
  distanceMeters: number;
  polyline: string;
  incidents: Incident[];
}
```

---

# 13. Data behavior required by UI

## Map default

- โหลด active incidents รอบพื้นที่แผนที่/current viewport
- ไม่โหลดทุก record ทั้งประเทศลง browser
- refresh เมื่อ map เปลี่ยนพื้นที่อย่างมี debounce

## Route search

หลังได้ route:

1. decode route polyline
2. match incident กับ route corridor
3. sort ตาม `distanceAlongRouteMeters`
4. ส่งเฉพาะ matched incidents ให้ Route Summary

## Nearby feed

1. ใช้ current location
2. query incident ภายใน radius
3. sort จากใกล้ → ไกล
4. สามารถกรอง category ฝั่ง client จาก normalized result ได้

---

# 14. PWA requirements

MVP ต้องติดตั้งเป็น PWA ได้

ต้องมี:

- Web App Manifest
- app name: `รู้ทาง`
- short name: `รู้ทาง`
- theme/background colors
- app icons อย่างน้อย 192 และ 512
- `display: standalone`
- service worker
- offline app shell
- update strategy ที่ไม่ reload user ขณะกำลังดู route

หากมี App Icon ของ “รู้ทาง” อยู่ใน repository แล้ว ให้ reuse icon เดิม ห้ามออกแบบ icon ใหม่เอง

---

# 15. Accessibility

- WCAG AA contrast สำหรับข้อความหลัก
- ทุก icon button มี `aria-label`
- Marker ต้องเลือกด้วย keyboard ได้บน desktop ถ้า map library รองรับ
- Chip ใช้ semantic button
- Bottom navigation มี active state ที่ screen reader เข้าใจ
- ห้ามใช้สีอย่างเดียวเพื่อบอก incident category
- Respect `prefers-reduced-motion`

---

# 16. Copywriting

ใช้ข้อความสั้นและตรง

ใช้:

- `ค้นหาเส้นทาง`
- `จะไปที่ไหน?`
- `พบเหตุการณ์ตามทาง 3 จุด`
- `จะเจอระหว่างทาง`
- `เหตุการณ์ใกล้คุณ`
- `ยังไม่พบเหตุการณ์ที่รายงาน`
- `ข้อมูลบางส่วนอาจไม่ครบ`

หลีกเลี่ยง:

- “AI วิเคราะห์แล้วว่า…” ใน MVP
- “เส้นทางนี้ปลอดภัย”
- “รับรองว่าไม่มีน้ำท่วม”
- technical terms เช่น GeoJSON, corridor, API ใน UI ผู้ใช้

---

# 17. MVP acceptance criteria

UI ถือว่า implement เสร็จเมื่อครบทั้งหมดนี้:

- [ ] เปิด PWA แล้วเห็น map เป็น primary surface
- [ ] มี navigation เพียง `แผนที่` และ `ใกล้ฉัน`
- [ ] ใช้ Prompt สำหรับ heading และ Sarabun สำหรับ body
- [ ] แสดง marker จาก normalized Traffy + Longdo incidents
- [ ] Marker แยก category ได้ด้วย icon + color
- [ ] กด marker แล้วเปิด incident bottom sheet
- [ ] Search route จากต้นทาง → ปลายทางได้
- [ ] Route polyline แสดงบนแผนที่
- [ ] Route Summary แสดง ETA, distance และจำนวนเหตุการณ์ตามทาง
- [ ] Event ตาม route เรียงตามลำดับที่จะเจอ
- [ ] Route ไม่มี event ใช้ข้อความ `ยังไม่พบเหตุการณ์ที่รายงาน`
- [ ] Nearby Feed เรียงตามระยะจาก current location
- [ ] กด Feed card แล้วกระโดดกลับ map และ focus marker ได้
- [ ] Denied location ไม่ทำให้แอปใช้งานไม่ได้ทั้งหมด
- [ ] Source ใด source หนึ่งล่ม อีก source ยังใช้งานต่อได้
- [ ] รองรับ loading / empty / error / offline state
- [ ] touch target >= 48 px
- [ ] mobile viewport 360–430 px ไม่มี horizontal overflow
- [ ] PWA installable
- [ ] desktop layout เปลี่ยนเป็น sidebar + map โดยไม่สร้าง UX คนละระบบ

---

# 18. Out of scope — ห้ามเพิ่มใน MVP นี้

ห้ามเพิ่มเองหากไม่ได้รับคำสั่งใหม่:

- Qwen / LLM
- Login / Account
- Firebase authentication
- Push notification
- User-generated incident report
- Chat assistant
- Risk score แบบ AI
- Route history
- Favorite routes
- Weather
- Longdo Traffic Status
- Social sharing
- Ads

---

# 19. Instruction for Codex

ก่อน implement:

1. อ่านไฟล์นี้ทั้งไฟล์
2. ตรวจ codebase ปัจจุบันก่อนสร้าง component ใหม่
3. รักษา design token และ architecture เดิมถ้ามี
4. ห้ามเปลี่ยน scope โดยเพิ่ม feature จาก `Out of scope`
5. ถ้า backend/API ยังไม่พร้อม ให้สร้าง typed mock adapter โดย interface ต้องเหมือน production adapter
6. UI ต้องไม่ผูกกับ raw Traffy หรือ Longdo response โดยตรง
7. Implement mobile layout ก่อน แล้วค่อย desktop responsive
8. ทำ loading, empty, error และ denied-permission state ไปพร้อม happy path
9. เมื่อ implement เสร็จ ให้รัน lint, typecheck, unit tests และ production build
10. รายงานไฟล์ที่แก้, test ที่รัน และสิ่งที่ยังเป็น mock

## Suggested implementation order

### Phase 1 — Shell

- PWA manifest
- fonts
- design tokens
- bottom navigation
- map placeholder
- responsive app shell

### Phase 2 — Incident map

- normalized Incident model
- mock/real adapters
- markers
- marker detail sheet
- clustering

### Phase 3 — Route search

- origin/destination UI
- route polyline
- route corridor matching
- Route Summary Sheet
- ordered route incidents

### Phase 4 — Nearby Feed

- current location
- radius/category filter
- feed card
- feed → map deep interaction

### Phase 5 — Production states

- partial API failure
- offline shell/cache
- accessibility
- performance
- PWA installation verification

---

# 20. Definition of Done

อย่าถือว่างานเสร็จเพียงเพราะหน้าตาเหมือน mockup

งานเสร็จเมื่อ:

- happy path ใช้งานได้จริง
- UI อ่านง่ายบนมือถือ
- route + incident interactions ทำงานครบ
- Traffy/Longdo ถูก normalize ก่อนถึง UI
- ไม่มี secret/API key ฝังใน client โดยไม่จำเป็น
- error state ไม่ทำให้แอปพังทั้งหน้า
- lint/typecheck/tests/build ผ่าน
- scope ยังตรงกับ MVP ในเอกสารนี้
