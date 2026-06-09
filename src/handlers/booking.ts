import type { messagingApi } from '@line/bot-sdk';
import type { BookingSession, Booking } from '@/types';
import { getLineClient, buildTextMessage, buildQuickReply } from '@/lib/line';
import { getRooms, saveBooking } from '@/lib/notion';
import { saveSession, clearSession } from '@/lib/session';

type ReplyToken = string;

function generateBookingId(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `LH${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${Date.now().toString().slice(-4)}`;
}

function parseDate(input: string): string | null {
  // Accept DD/MM/YYYY or YYYY-MM-DD
  const ddmmyyyy = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const iso = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return input;
  return null;
}

function formatDateTH(iso: string): string {
  const [y, m, d] = iso.split('-');
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${Number(d)} ${months[Number(m) - 1]} ${Number(y) + 543}`;
}

function nightCount(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

export async function startBookingFlow(
  replyToken: ReplyToken,
  userId: string
): Promise<void> {
  const client = getLineClient();
  const rooms = await getRooms();
  const available = rooms.filter((r) => r.available);

  if (available.length === 0) {
    await client.replyMessage({
      replyToken,
      messages: [buildTextMessage('ขออภัยค่ะ ขณะนี้ไม่มีห้องว่าง กรุณาติดต่อเจ้าหน้าที่ที่ ' + (process.env.HOTEL_PHONE ?? '') + ' 🙏')],
    });
    return;
  }

  const quickReplyItems = available.slice(0, 10).map((room) => ({
    label: `${room.name} (${room.price.toLocaleString()}฿)`,
    data: `action=SELECT_ROOM&roomId=${room.id}&roomName=${encodeURIComponent(room.name)}&roomPrice=${room.price}`,
    displayText: room.name,
  }));

  const roomList = available
    .map((r) => `🛏 *${r.name}* — ${r.price.toLocaleString()} บาท/คืน (${r.capacity} คน)\n   ${r.description}`)
    .join('\n\n');

  await client.replyMessage({
    replyToken,
    messages: [
      buildTextMessage(`ยินดีต้อนรับค่ะ! 🏨\n\nห้องพักที่มีให้บริการ:\n\n${roomList}\n\nกรุณาเลือกห้องพักที่ต้องการ 👇`, buildQuickReply(quickReplyItems)),
    ],
  });
}

export async function handleBookingStep(
  replyToken: ReplyToken,
  session: BookingSession,
  input: string
): Promise<void> {
  const client = getLineClient();

  // Handle cancel at any step
  if (['ยกเลิก', 'cancel', 'ออก', 'exit'].includes(input.toLowerCase())) {
    await clearSession(session.userId);
    await client.replyMessage({
      replyToken,
      messages: [buildTextMessage('ยกเลิกการจองแล้วค่ะ 😊 หากต้องการจองใหม่ กด "จองห้องพัก" ได้เลยนะคะ')],
    });
    return;
  }

  switch (session.step) {
    case 'SELECT_ROOM':
      await askCheckIn(replyToken, session, client);
      break;

    case 'ENTER_CHECKIN': {
      const date = parseDate(input.trim());
      if (!date) {
        await client.replyMessage({
          replyToken,
          messages: [buildTextMessage('กรุณาระบุวันที่ให้ถูกต้อง เช่น 25/12/2025 หรือ 2025-12-25 ค่ะ')],
        });
        return;
      }
      if (new Date(date) < new Date()) {
        await client.replyMessage({
          replyToken,
          messages: [buildTextMessage('วันเช็คอินต้องเป็นวันในอนาคตนะคะ 📅')],
        });
        return;
      }
      const updated = { ...session, step: 'ENTER_CHECKOUT' as const, checkIn: date };
      await saveSession(updated);
      await client.replyMessage({
        replyToken,
        messages: [buildTextMessage(`เช็คอิน: ${formatDateTH(date)} ✅\n\nกรุณาระบุวันเช็คเอาต์ (รูปแบบ วว/ดด/ปปปป) ค่ะ`)],
      });
      break;
    }

    case 'ENTER_CHECKOUT': {
      const date = parseDate(input.trim());
      if (!date) {
        await client.replyMessage({
          replyToken,
          messages: [buildTextMessage('กรุณาระบุวันที่ให้ถูกต้อง เช่น 27/12/2025 ค่ะ')],
        });
        return;
      }
      if (new Date(date) <= new Date(session.checkIn!)) {
        await client.replyMessage({
          replyToken,
          messages: [buildTextMessage('วันเช็คเอาต์ต้องหลังจากวันเช็คอินนะคะ 📅')],
        });
        return;
      }
      const updated = { ...session, step: 'ENTER_GUESTS' as const, checkOut: date };
      await saveSession(updated);
      const nights = nightCount(session.checkIn!, date);
      await client.replyMessage({
        replyToken,
        messages: [
          buildTextMessage(
            `เช็คเอาต์: ${formatDateTH(date)} ✅ (${nights} คืน)\n\nกรุณาระบุจำนวนผู้เข้าพัก (ตัวเลข) ค่ะ`,
            buildQuickReply([
              { label: '1 คน', data: 'action=GUESTS&count=1', displayText: '1 คน' },
              { label: '2 คน', data: 'action=GUESTS&count=2', displayText: '2 คน' },
              { label: '3 คน', data: 'action=GUESTS&count=3', displayText: '3 คน' },
              { label: '4 คน', data: 'action=GUESTS&count=4', displayText: '4 คน' },
            ])
          ),
        ],
      });
      break;
    }

    case 'ENTER_GUESTS': {
      const count = parseInt(input.trim(), 10);
      if (isNaN(count) || count < 1 || count > 10) {
        await client.replyMessage({
          replyToken,
          messages: [buildTextMessage('กรุณาระบุจำนวนผู้เข้าพักเป็นตัวเลข (1-10) ค่ะ')],
        });
        return;
      }
      const updated = { ...session, step: 'ENTER_NAME' as const, guests: count };
      await saveSession(updated);
      await client.replyMessage({
        replyToken,
        messages: [buildTextMessage(`จำนวนผู้เข้าพัก: ${count} คน ✅\n\nกรุณาระบุชื่อ-นามสกุล ผู้ทำการจองค่ะ`)],
      });
      break;
    }

    case 'ENTER_NAME': {
      if (input.trim().length < 2) {
        await client.replyMessage({
          replyToken,
          messages: [buildTextMessage('กรุณาระบุชื่อ-นามสกุลให้ครบถ้วนค่ะ')],
        });
        return;
      }
      const updated = { ...session, step: 'ENTER_PHONE' as const, guestName: input.trim() };
      await saveSession(updated);
      await client.replyMessage({
        replyToken,
        messages: [buildTextMessage(`ชื่อผู้จอง: ${input.trim()} ✅\n\nกรุณาระบุเบอร์โทรศัพท์เพื่อการยืนยันค่ะ 📱`)],
      });
      break;
    }

    case 'ENTER_PHONE': {
      const phone = input.trim().replace(/[-\s]/g, '');
      if (!/^[0-9]{9,10}$/.test(phone)) {
        await client.replyMessage({
          replyToken,
          messages: [buildTextMessage('กรุณาระบุเบอร์โทรศัพท์ที่ถูกต้อง เช่น 0812345678 ค่ะ')],
        });
        return;
      }
      const updated = { ...session, step: 'CONFIRM' as const, phone };
      await saveSession(updated);
      await showConfirmation(replyToken, updated, client);
      break;
    }

    case 'CONFIRM':
      await client.replyMessage({
        replyToken,
        messages: [buildTextMessage('กรุณากดปุ่ม "ยืนยันการจอง" หรือ "ยกเลิก" เพื่อดำเนินการต่อค่ะ 😊')],
      });
      break;
  }
}

async function askCheckIn(
  replyToken: ReplyToken,
  session: BookingSession,
  client: messagingApi.MessagingApiClient
): Promise<void> {
  const updated = { ...session, step: 'ENTER_CHECKIN' as const };
  await saveSession(updated);
  await client.replyMessage({
    replyToken,
    messages: [buildTextMessage(`เลือกแล้ว: ${session.roomName} 🛏\n\nกรุณาระบุวันเช็คอิน (รูปแบบ วว/ดด/ปปปป)\nเช่น 25/12/2025 ค่ะ`)],
  });
}

async function showConfirmation(
  replyToken: ReplyToken,
  session: BookingSession,
  client: messagingApi.MessagingApiClient
): Promise<void> {
  const nights = nightCount(session.checkIn!, session.checkOut!);
  const total = (session.roomPrice ?? 0) * nights;

  const summary = [
    '📋 สรุปการจองห้องพัก',
    '─────────────────',
    `🏨 ห้องพัก: ${session.roomName}`,
    `📅 เช็คอิน: ${formatDateTH(session.checkIn!)}`,
    `📅 เช็คเอาต์: ${formatDateTH(session.checkOut!)}`,
    `🌙 จำนวนคืน: ${nights} คืน`,
    `👥 จำนวนผู้เข้าพัก: ${session.guests} คน`,
    `👤 ชื่อผู้จอง: ${session.guestName}`,
    `📱 โทรศัพท์: ${session.phone}`,
    `💰 ราคารวม: ${total.toLocaleString()} บาท`,
    '─────────────────',
    'ยืนยันการจองหรือไม่คะ?',
  ].join('\n');

  await client.replyMessage({
    replyToken,
    messages: [
      buildTextMessage(
        summary,
        buildQuickReply([
          { label: '✅ ยืนยันการจอง', data: 'action=CONFIRM_BOOKING', displayText: 'ยืนยันการจอง' },
          { label: '❌ ยกเลิก', data: 'action=CANCEL_BOOKING', displayText: 'ยกเลิก' },
        ])
      ),
    ],
  });
}

export async function confirmBooking(
  replyToken: ReplyToken,
  session: BookingSession,
  lineDisplayName?: string
): Promise<void> {
  const client = getLineClient();
  const bookingId = generateBookingId();
  const nights = nightCount(session.checkIn!, session.checkOut!);
  const total = (session.roomPrice ?? 0) * nights;

  const booking: Booking = {
    bookingId,
    userId: session.userId,
    lineDisplayName,
    roomName: session.roomName!,
    roomPrice: session.roomPrice!,
    checkIn: session.checkIn!,
    checkOut: session.checkOut!,
    guests: session.guests!,
    guestName: session.guestName!,
    phone: session.phone!,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  await saveBooking(booking);
  await clearSession(session.userId);

  const confirmMsg = [
    '🎉 จองห้องพักสำเร็จแล้วค่ะ!',
    '',
    `📌 หมายเลขการจอง: ${bookingId}`,
    `🏨 ${session.roomName}`,
    `📅 ${formatDateTH(session.checkIn!)} → ${formatDateTH(session.checkOut!)} (${nights} คืน)`,
    `💰 ยอดรวม: ${total.toLocaleString()} บาท`,
    '',
    'ทางโรงแรมจะติดต่อยืนยันการจองภายใน 24 ชั่วโมงนะคะ 😊',
    `หากมีคำถาม โทร ${process.env.HOTEL_PHONE ?? ''}`,
  ].join('\n');

  await client.replyMessage({
    replyToken,
    messages: [buildTextMessage(confirmMsg)],
  });
}
