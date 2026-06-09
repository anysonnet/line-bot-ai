# Life Hotel LINE OA Chatbot

LINE Official Account chatbot สำหรับ Life Hotel พร้อม AI ตอบคำถามอัตโนมัติ จองห้องพัก และ Rich Menu

## Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **LINE Bot**: `@line/bot-sdk` v9
- **AI**: Google Gemini 2.0 Flash (`@google/genai`)
- **Database**: Notion (ห้องพัก / FAQ / การจอง / Session)
- **Deploy**: Vercel

## ฟีเจอร์

- 🤖 ตอบคำถามทั่วไปด้วย Gemini AI (ภาษาไทย/อังกฤษ)
- 🛏 จองห้องพักแบบ multi-step conversation
- 📋 Quick Reply buttons สำหรับตัวเลือก
- 🏨 Rich Menu 3 ปุ่ม (จองห้อง / ดูห้องพัก / ที่ตั้ง)
- 📊 บันทึกการจองลง Notion
- 💾 Session state ต่อยูสเซอร์ (รองรับ serverless)

---

## Setup

### 1. ติดตั้ง dependencies

```bash
npm install
```

### 2. ตั้งค่า Environment Variables

คัดลอก `.env.example` เป็น `.env.local` แล้วกรอกค่า:

```bash
cp .env.example .env.local
```

| Variable | รายละเอียด |
|---|---|
| `LINE_CHANNEL_ACCESS_TOKEN` | จาก LINE Developers Console > Messaging API |
| `LINE_CHANNEL_SECRET` | จาก LINE Developers Console > Channel Secret |
| `GOOGLE_AI_API_KEY` | จาก [Google AI Studio](https://aistudio.google.com/) |
| `NOTION_API_KEY` | จาก Notion Integration |
| `NOTION_ROOMS_DB_ID` | Notion Database ID สำหรับห้องพัก |
| `NOTION_FAQS_DB_ID` | Notion Database ID สำหรับ FAQ |
| `NOTION_BOOKINGS_DB_ID` | Notion Database ID สำหรับการจอง |
| `NOTION_SESSIONS_DB_ID` | Notion Database ID สำหรับ session |
| `HOTEL_NAME` | ชื่อโรงแรม เช่น `Life Hotel` |
| `HOTEL_ADDRESS` | ที่อยู่โรงแรม |
| `HOTEL_PHONE` | เบอร์โทรศัพท์ |
| `SETUP_SECRET` | รหัสลับสำหรับ setup endpoint (ตั้งเองได้) |

### 3. ตั้งค่า Notion Databases

สร้าง Integration ที่ [notion.so/my-integrations](https://www.notion.so/my-integrations) แล้วสร้าง 4 databases:

#### Rooms Database
| Property | Type |
|---|---|
| Name | Title |
| Type | Select |
| Price | Number |
| Capacity | Number |
| Description | Rich Text |
| Amenities | Multi-select |
| Available | Checkbox |

#### FAQs Database
| Property | Type |
|---|---|
| Question | Title |
| Answer | Rich Text |
| Category | Select |

#### Bookings Database
| Property | Type |
|---|---|
| Booking ID | Title |
| User ID | Rich Text |
| Guest Name | Rich Text |
| Phone | Rich Text |
| Room | Rich Text |
| Price/Night | Number |
| Check In | Date |
| Check Out | Date |
| Guests | Number |
| Status | Select (pending/confirmed/cancelled) |
| LINE Name | Rich Text |
| Created At | Date |

#### Sessions Database
| Property | Type |
|---|---|
| User ID | Title |
| Step | Select |
| Data | Rich Text |
| Updated At | Date |

### 4. Run ในเครื่อง

```bash
npm run dev
```

ใช้ [ngrok](https://ngrok.com/) เพื่อ expose localhost:

```bash
ngrok http 3000
```

ใส่ URL จาก ngrok ใน LINE Developers Console:
`https://xxxx.ngrok.io/api/webhook`

### 5. Deploy บน Vercel

```bash
vercel deploy
```

หรือ push ขึ้น GitHub แล้วเชื่อม Vercel

ใส่ Environment Variables ใน Vercel Dashboard แล้วตั้ง Webhook URL:
`https://your-app.vercel.app/api/webhook`

### 6. ตั้งค่า Rich Menu (ครั้งเดียว)

หลัง deploy แล้ว เรียก:
```
GET https://your-app.vercel.app/api/setup?secret=YOUR_SETUP_SECRET
```

จากนั้นอัปโหลดรูป Rich Menu (2500×843 px) ผ่าน LINE API

---

## โครงสร้างโปรเจกต์

```
src/
├── app/
│   ├── api/
│   │   ├── webhook/route.ts    ← LINE webhook
│   │   └── setup/route.ts      ← Rich Menu setup
│   ├── layout.tsx
│   └── page.tsx
├── handlers/
│   ├── message.ts              ← จัดการข้อความ + AI
│   ├── postback.ts             ← จัดการปุ่ม/postback
│   ├── follow.ts               ← ยินดีต้อนรับ
│   └── booking.ts              ← ขั้นตอนจองห้องพัก
├── lib/
│   ├── line.ts                 ← LINE client
│   ├── gemini.ts               ← Google Gemini AI
│   ├── notion.ts               ← Notion data
│   └── session.ts              ← User session
└── types/
    └── index.ts                ← TypeScript types
```
