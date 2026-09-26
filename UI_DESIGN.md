# รู้ทาง — PWA UI Design

> Mobile-first interface สำหรับวางแผนเส้นทางก่อนออกเดินทาง โดยแสดงรายงานเหตุการณ์ตามเส้นทางและ Feed ใกล้ฉัน

![รู้ทาง App Icon](assets/ru-thang-app-icon-1024.png)

## 1. Design Direction

- ชัดเจน สงบ น่าเชื่อถือ และอ่านได้เร็ว
- ใช้แผนที่เป็นพื้นที่หลัก ไม่ทำ UI หนาแน่นแบบ dashboard
- เหมาะกับการดูบนที่วางมือถือในรถ แต่ไม่ใช่ turn-by-turn navigation
- แสดงแหล่งข้อมูล เวลาอัปเดต และความไม่แน่นอนเสมอ
- ใช้คำว่า “มีรายงาน” หรือ “ใกล้เส้นทาง” แทนการยืนยันเหตุการณ์
- ห้ามใช้คำว่า “ปลอดภัย” หรือรับรองว่าถนนผ่านได้

MVP มี navigation เพียง 2 เมนู:

1. **แผนที่**
2. **ใกล้ฉัน**

## 2. Brand

| Item                | Value                               |
| ------------------- | ----------------------------------- |
| Display name        | รู้ทาง                              |
| Tagline             | รู้ก่อนเลือกเส้นทาง                 |
| Product description | ดูสิ่งที่จะเจอตลอดเส้นทาง           |
| Icon                | `assets/ru-thang-app-icon-1024.png` |

Icon ใช้ภาพถนนในเลนส์สีน้ำเงินและจุดเตือนสีส้ม ห้ามเติมตัวอักษร badge หรือ corner radius ลงใน source icon

## 3. Typography

| Usage              | Font    | Weight  | Mobile size |
| ------------------ | ------- | ------- | ----------: |
| App name           | Prompt  | 600     |       22 px |
| Screen heading     | Prompt  | 600     |       20 px |
| Card heading / ETA | Prompt  | 500–600 |       18 px |
| Button             | Prompt  | 500     |       16 px |
| Body               | Sarabun | 400     |       16 px |
| Label / metadata   | Sarabun | 400–500 |       14 px |
| Caption            | Sarabun | 400     |       12 px |

```css
:root {
  --font-heading: 'Prompt', system-ui, sans-serif;
  --font-body: 'Sarabun', system-ui, sans-serif;
}
```

Body text ไม่ต่ำกว่า 14 px และข้อมูลสำคัญไม่ต่ำกว่า 16 px รองรับ browser zoom 200% โดยไม่ตัดข้อความสำคัญ

## 4. Color Tokens

```css
:root {
  --color-primary: #1267e8;
  --color-primary-dark: #0b4eb8;
  --color-primary-soft: #eaf2ff;
  --color-accent: #f59e0b;
  --color-bg: #f5f7fa;
  --color-surface: #ffffff;
  --color-text: #10223a;
  --color-text-muted: #617086;
  --color-border: #dde4ed;
  --color-border-strong: #8494a8; /* form-field outlines, 3:1 on white */
  --color-focus: #0b4eb8; /* focus ring, 7:1 on white and bg */
  --color-success: #16845b;
  --color-danger: #d64545;
  --color-flood: #1677d2;
  --color-accident: #d64545;
  --color-road: #b45309; /* darkened from #d98216 so white labels reach 4.5:1 */
  --color-construction: #8a5bd1;
}
```

สีของ marker ต้องใช้ร่วมกับ icon และ label เสมอ ห้ามสื่อประเภทหรือสถานะด้วยสีอย่างเดียว

## 5. Layout Foundation

- Primary viewport: 390 × 844 px
- รองรับตั้งแต่ 360 px ขึ้นไป
- Content max-width บน desktop: 1280 px
- Touch target ขั้นต่ำ: 44 × 44 px
- Primary button สูงขั้นต่ำ: 52 px
- Border radius: card 18 px, input/button 14 px, chips 999 px
- ใช้ spacing scale 4, 8, 12, 16, 20, 24, 32 px
- รองรับ `env(safe-area-inset-*)` ใน standalone PWA

### Responsive

**Mobile (< 768 px)**

- Full-screen map
- Search panel ด้านบน
- Route result เป็น bottom sheet
- Bottom navigation ติดขอบล่าง

**Tablet/Desktop (≥ 768 px)**

- Map ทางขวาประมาณ 65%
- Search/results panel ทางซ้ายประมาณ 35%
- Bottom navigation เปลี่ยนเป็น compact side/top navigation ได้
- ไม่ยืด mobile card เต็มจอกว้าง

## 6. App Shell

```text
┌─────────────────────────────┐
│ รู้ทาง                      │
│ รู้ก่อนเลือกเส้นทาง         │
│ ● อัปเดตล่าสุด 2 นาทีที่แล้ว │
├─────────────────────────────┤
│ Active screen               │
│                             │
├─────────────────────────────┤
│ แผนที่            ใกล้ฉัน   │
└─────────────────────────────┘
```

Header ต้องกะทัดรัดและไม่แย่งพื้นที่แผนที่ สถานะข้อมูลใช้ dot + ข้อความ ไม่ใช้ dot เพียงอย่างเดียว

Bottom navigation:

- มีเพียง 2 items
- แสดง icon และ text label
- active state ใช้สี พื้นหลัง และน้ำหนักข้อความร่วมกัน
- สูงอย่างน้อย 64 px รวม safe area

## 7. Map Screen

### Default state

```text
Header
Route Search Card
├── ตำแหน่งปัจจุบัน / ต้นทาง
├── ต้องการไปที่ไหน
└── [ค้นหาเส้นทาง]
Map
├── Current location
├── Incident pins
└── Recenter control
Bottom Navigation
```

### Route search card

- White opaque surface เพื่อให้อ่านได้บนแผนที่
- Origin และ destination สูงอย่างน้อย 48 px
- Origin มี location icon; destination มี pin icon
- มี swap button เฉพาะเมื่อใช้งานได้จริง
- ปุ่ม “ค้นหาเส้นทาง” ใช้ primary blue เต็มความกว้าง
- ระหว่างค้นหา ปุ่มแสดง spinner และ “กำลังค้นหาเส้นทาง”
- Validation แสดงใต้ field ไม่ใช้ toast อย่างเดียว

### Map

- Google Maps ใช้ visual style ที่ลด POI ที่ไม่จำเป็น
- Selected route ใช้เส้น primary blue หนาและ contrast สูง
- Alternative routes ใช้เส้นเทา/ฟ้าอ่อนบางกว่า
- ก่อนเลือก route แสดง incidents ตาม viewport แบบ cluster
- หลังเลือก route แสดงเฉพาะ incidents ที่สัมพันธ์กับ route
- Recenter button อยู่เหนือ bottom sheet/navigation และไม่บังข้อมูล Google

### Incident marker

| Category          | Icon concept                 | Color  |
| ----------------- | ---------------------------- | ------ |
| น้ำท่วม           | waves                        | Blue   |
| อุบัติเหตุ        | warning triangle / collision | Red    |
| รถเสีย            | car + alert                  | Orange |
| ถนนชำรุด/หลุม     | broken road                  | Amber  |
| ก่อสร้าง          | cone                         | Purple |
| สิ่งกีดขวาง/ระวัง | diamond alert                | Orange |
| เพลิงไหม้         | flame                        | Red    |
| ฝน                | cloud rain                   | Blue   |

- Marker ขนาด tap area อย่างน้อย 44 px
- Selected marker ขยายเล็กน้อยและมี outline
- Cluster แสดงจำนวน ไม่แสดงสี category เดียวเมื่อมีหลายประเภท
- Accessibility label เช่น “มีรายงานน้ำท่วม ใกล้ถนนพระรามสอง”

### Marker detail panel

```text
น้ำท่วม
มีรายงานน้ำท่วมบริเวณถนน...

ใกล้เส้นทาง 120 ม. • ข้างหน้า 3.2 กม.
Longdo/iTIC • อัปเดต 12 นาทีที่แล้ว

[ดูตำแหน่งบนแผนที่]
```

ต้องมี category, title, short description, relation to route, source, timestamp และ freshness warning เมื่อจำเป็น

## 8. Route Results

บน mobile แสดงเป็น bottom sheet 3 ระดับ:

- Collapsed: ETA + จำนวนเหตุการณ์
- Half: route summary + top findings
- Expanded: findings ทั้งหมดและ route alternatives

ตัวอย่าง:

```text
42 นาที                     พบ 3 เหตุการณ์
28 กม.

สิ่งที่อาจพบตามเส้นทาง
น้ำท่วม       ข้างหน้า 3.2 กม.
อุบัติเหตุ    ข้างหน้า 11 กม.
ถนนชำรุด     ข้างหน้า 18 กม.
```

Route option ต้องแสดง:

- เวลาเดินทาง
- ระยะทาง
- เวลาเพิ่มจาก route เร็วที่สุด ถ้ามี
- จำนวนรายงานที่ match
- ไม่แสดง Risk Score ใน MVP

เมื่อเลือก route ใหม่ ต้องเปลี่ยนพร้อมกัน:

- Polyline emphasis
- Visible pins
- ETA/distance
- Incident count
- Findings order

ห้ามให้ sheet ปิดบังเส้นทางทั้งหมด และต้องยัง pan/zoom map ได้

### No findings

```text
ยังไม่พบรายงานเหตุการณ์ใกล้เส้นทางนี้
ข้อมูลนี้ไม่ใช่การยืนยันว่าเส้นทางปลอดภัยหรือผ่านได้แน่นอน
```

## 9. Nearby Feed

### Layout

```text
ใกล้ฉัน
เหตุการณ์ภายใน 10 กม.

[ทั้งหมด] [น้ำท่วม] [อุบัติเหตุ] [ถนน]

Incident Card
Incident Card
Incident Card
```

### Filter chips

- Horizontal scroll บน mobile
- Chip แรกคือ “ทั้งหมด”
- Selected ใช้ primary fill + white text
- แต่ละ chip สูงอย่างน้อย 40 px
- จำนวน filter ต้องสะท้อนหมวดจริง ไม่สร้างหมวดที่ backend ไม่มี

### Incident card

```text
[icon] น้ำท่วม                         1.2 กม.
มีรายงานน้ำท่วมขัง ถนนบางขุนเทียน
Longdo/iTIC • 12 นาทีที่แล้ว
```

Card ต้องแสดง:

- Icon และ category
- Title สูงสุด 2 บรรทัด
- Source และเวลารายงาน
- ระยะจากผู้ใช้
- Freshness/status badge เมื่อจำเป็น

แตะ card แล้วเปิด detail sheet พร้อม action “ดูบนแผนที่”

### Location denied

```text
ยังดูเหตุการณ์ใกล้คุณไม่ได้
อนุญาตตำแหน่ง หรือเลือกพื้นที่บนแผนที่

[อนุญาตตำแหน่ง] [เลือกพื้นที่]
```

## 10. System States

### Loading

- แสดง skeleton ใน cards/sheet
- Map ยังใช้งานได้ถ้าโหลดสำเร็จแล้ว
- หลีกเลี่ยง full-screen spinner หลัง initial load

### Partial provider failure

```text
ข้อมูลบางแหล่งยังไม่พร้อม
ผลลัพธ์อาจไม่ครบถ้วน • ลองใหม่
```

### Offline

```text
คุณกำลังออฟไลน์
ต้องเชื่อมต่ออินเทอร์เน็ตเพื่อค้นหาเส้นทางและอัปเดตเหตุการณ์
```

ห้ามแสดง cached incident เป็นข้อมูลสด ต้องแสดง timestamp

### Google Maps/Routes error

- Map load fail: แสดง retry panel พร้อมคำอธิบายสั้น
- Route not found: เก็บ inputs ไว้และเสนอให้แก้ต้นทาง/ปลายทาง
- API quota/config error: user copy เป็นกลาง; technical detail อยู่ใน logs

## 11. Accessibility and Driving Readability

- Contrast ตาม WCAG AA
- Keyboard navigation ครบทุก control
- Visible focus ring
- Screen reader อ่าน category, distance, source, time และ relation to route
- ใช้ `aria-live="polite"` กับผล route/partial warning
- Respect `prefers-reduced-motion`
- Animation 150–250 ms และไม่มี parallax/continuous pulse
- ไม่ใช้ icon-only action ถ้าความหมายไม่ชัด
- หลีกเลี่ยง modal ซ้อน modal
- ขณะรถเคลื่อนที่ผู้ใช้ไม่ควรต้องอ่าน paragraph ยาวหรือจัดการ form ซับซ้อน

## 12. Component Inventory

```text
AppShell
├── AppHeader
├── MapScreen
│   ├── RouteSearchCard
│   ├── MapCanvas
│   ├── IncidentMarker / IncidentCluster
│   ├── MapControls
│   ├── RouteResultSheet
│   └── IncidentDetailSheet
├── NearbyFeedScreen
│   ├── FeedHeader
│   ├── CategoryFilters
│   ├── IncidentCard
│   └── LocationPermissionState
└── BottomNavigation
```

Reusable states:

- LoadingSkeleton
- EmptyState
- InlineError
- PartialDataBanner
- OfflineBanner
- FreshnessLabel
- SourceBadge

## 13. Copy Rules

ใช้:

- “มีรายงานน้ำท่วม”
- “พบรายงานเหตุการณ์ใกล้เส้นทาง 3 จุด”
- “ใกล้เส้นทางประมาณ 120 เมตร”
- “ข้อมูลบางแหล่งยังไม่พร้อม”

ห้ามใช้:

- “ถนนเส้นนี้น้ำท่วมแน่นอน”
- “เส้นทางนี้ปลอดภัย”
- “ผ่านได้แน่นอน”
- “ข้อมูลเรียลไทม์” หาก provider ไม่รับรอง

## 14. UI Acceptance Criteria

- UI ตรงกับ two-tab PWA mockup
- Prompt/Sarabun ถูกใช้ตามบทบาท
- อ่าน core information ได้ที่ 390 × 844 px
- Search CTA, markers, cards และ navigation ผ่าน touch-target minimum
- Selected route เปลี่ยน polyline, pins และ findings พร้อมกัน
- Route results ไม่มี Risk Score หรือฟีเจอร์นอก MVP
- Feed เรียงระยะและกรอง category ได้
- Source/timestamp ปรากฏใน card/detail
- Permission denied, empty, partial, error และ offline states ครบ
- ไม่มีข้อความรับรองความปลอดภัย
- รองรับ keyboard, screen reader, reduced motion และ zoom 200%

## 15. Codex UI Prompt

```text
Read AGENTS.md, IMPLEMENTATION_PLAN.md and UI_DESIGN.md completely.

Implement the PWA UI foundation using React and TypeScript:
1. Build the two-tab shell: Map and Nearby.
2. Follow the mobile layout and responsive behavior in UI_DESIGN.md.
3. Use Prompt for headings and Sarabun for body content.
4. Create reusable route search, marker, result sheet, feed card and state components.
5. Use deterministic fixtures only; do not call production APIs.
6. Include loading, empty, location-denied, partial-data, error and offline states.
7. Add accessibility labels, keyboard focus, reduced-motion support and tests.

Do not add Weather, Qwen, Risk Score, login, database, Drive Mode or voice.
```
