import { Client, isFullPage } from '@notionhq/client';
import type { Room, FAQ, Booking } from '@/types';

let notion: Client | null = null;

function getNotion(): Client {
  if (!notion) {
    notion = new Client({ auth: process.env.NOTION_API_KEY! });
  }
  return notion;
}

// --- Fallback data (used when Notion is not configured) ---

const FALLBACK_ROOMS: Room[] = [
  {
    id: 'standard',
    name: 'Standard Room',
    type: 'Standard',
    price: 1500,
    capacity: 2,
    description: 'ห้องพักสะอาด สะดวกสบาย พร้อมสิ่งอำนวยความสะดวกครบครัน',
    amenities: ['เตียง Queen', 'แอร์', 'WiFi', 'ทีวี', 'ตู้เย็น'],
    available: true,
  },
  {
    id: 'deluxe',
    name: 'Deluxe Room',
    type: 'Deluxe',
    price: 2500,
    capacity: 2,
    description: 'ห้องพักดีลักซ์ วิวสวย พื้นที่กว้างขวาง',
    amenities: ['เตียง King', 'แอร์', 'WiFi', 'ทีวี 55 นิ้ว', 'ตู้เย็น', 'อ่างอาบน้ำ', 'วิวเมือง'],
    available: true,
  },
  {
    id: 'suite',
    name: 'Suite Room',
    type: 'Suite',
    price: 4500,
    capacity: 4,
    description: 'ห้องสวีท หรูหรา กว้างขวาง เหมาะสำหรับการพักผ่อนระดับพรีเมียม',
    amenities: ['เตียง King + โซฟา', 'แอร์', 'WiFi', 'ทีวี 65 นิ้ว', 'มินิบาร์', 'อ่างจาคูซี่', 'วิวพาโนรามา'],
    available: true,
  },
  {
    id: 'family',
    name: 'Family Room',
    type: 'Family',
    price: 3500,
    capacity: 4,
    description: 'ห้องครอบครัว เหมาะสำหรับครอบครัว มีพื้นที่กว้างขวาง',
    amenities: ['เตียง King + เตียงเดี่ยว 2', 'แอร์', 'WiFi', 'ทีวี', 'ตู้เย็น', 'โซฟา'],
    available: true,
  },
];

// --- Rooms ---

export async function getRooms(): Promise<Room[]> {
  const dbId = process.env.NOTION_ROOMS_DB_ID;
  if (!dbId) return FALLBACK_ROOMS;

  try {
    const response = await getNotion().databases.query({
      database_id: dbId,
      filter: { property: 'Available', checkbox: { equals: true } },
    });

    return response.results.filter(isFullPage).map((page) => {
      const props = page.properties as Record<string, any>;
      return {
        id: page.id,
        name: props['Name']?.title?.[0]?.plain_text ?? '',
        type: props['Type']?.select?.name ?? '',
        price: props['Price']?.number ?? 0,
        capacity: props['Capacity']?.number ?? 2,
        description: props['Description']?.rich_text?.[0]?.plain_text ?? '',
        amenities: props['Amenities']?.multi_select?.map((s: any) => s.name) ?? [],
        available: props['Available']?.checkbox ?? true,
      };
    });
  } catch (error) {
    console.error('Notion getRooms error:', error);
    return FALLBACK_ROOMS;
  }
}

export async function getHotelContext(query: string): Promise<string> {
  const rooms = await getRooms();
  const faqs = await getFAQs();

  const roomContext = rooms
    .map((r) => `${r.name}: ${r.price.toLocaleString()} บาท/คืน (${r.capacity} คน) - ${r.description}`)
    .join('\n');

  const relevantFaqs = faqs
    .filter((f) => f.question.includes(query.slice(0, 10)) || f.answer.includes(query.slice(0, 10)))
    .slice(0, 3)
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join('\n\n');

  return [
    roomContext ? `ห้องพักที่มีให้บริการ:\n${roomContext}` : '',
    relevantFaqs ? `FAQ ที่เกี่ยวข้อง:\n${relevantFaqs}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

// --- FAQs ---

export async function getFAQs(): Promise<FAQ[]> {
  const dbId = process.env.NOTION_FAQS_DB_ID;
  if (!dbId) return [];

  try {
    const response = await getNotion().databases.query({ database_id: dbId });

    return response.results.filter(isFullPage).map((page) => {
      const props = page.properties as Record<string, any>;
      return {
        question: props['Question']?.title?.[0]?.plain_text ?? '',
        answer: props['Answer']?.rich_text?.[0]?.plain_text ?? '',
        category: props['Category']?.select?.name ?? 'General',
      };
    });
  } catch (error) {
    console.error('Notion getFAQs error:', error);
    return [];
  }
}

// --- Bookings ---

export async function saveBooking(booking: Booking): Promise<void> {
  const dbId = process.env.NOTION_BOOKINGS_DB_ID;
  if (!dbId) {
    console.log('Booking saved (no Notion DB configured):', booking);
    return;
  }

  await getNotion().pages.create({
    parent: { database_id: dbId },
    properties: {
      'Booking ID': { title: [{ text: { content: booking.bookingId } }] },
      'User ID': { rich_text: [{ text: { content: booking.userId } }] },
      'Guest Name': { rich_text: [{ text: { content: booking.guestName } }] },
      'Phone': { rich_text: [{ text: { content: booking.phone } }] },
      'Room': { rich_text: [{ text: { content: booking.roomName } }] },
      'Price/Night': { number: booking.roomPrice },
      'Check In': { date: { start: booking.checkIn } },
      'Check Out': { date: { start: booking.checkOut } },
      'Guests': { number: booking.guests },
      'Status': { select: { name: booking.status } },
      'LINE Name': { rich_text: [{ text: { content: booking.lineDisplayName ?? '' } }] },
      'Created At': { date: { start: booking.createdAt } },
    },
  });
}
