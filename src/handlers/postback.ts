import type { PostbackEvent } from '@line/bot-sdk';
import { getLineClient, buildTextMessage } from '@/lib/line';
import { getSession, saveSession } from '@/lib/session';
import { startBookingFlow, handleBookingStep, confirmBooking } from './booking';

function parsePostbackData(data: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(data));
}

export async function handlePostback(event: PostbackEvent): Promise<void> {
  if (!event.source.userId) return;

  const userId = event.source.userId;
  const replyToken = event.replyToken;
  const client = getLineClient();
  const params = parsePostbackData(event.postback.data);
  const action = params.action;

  switch (action) {
    case 'START_BOOKING':
      return startBookingFlow(replyToken, userId);

    case 'SELECT_ROOM': {
      const session = {
        userId,
        step: 'SELECT_ROOM' as const,
        roomId: params.roomId,
        roomName: decodeURIComponent(params.roomName ?? ''),
        roomPrice: Number(params.roomPrice ?? 0),
      };
      await saveSession(session);
      return handleBookingStep(replyToken, session, '');
    }

    case 'GUESTS': {
      const session = await getSession(userId);
      if (!session) {
        await client.replyMessage({
          replyToken,
          messages: [buildTextMessage('เซสชันหมดอายุค่ะ กรุณาเริ่มการจองใหม่อีกครั้ง')],
        });
        return;
      }
      return handleBookingStep(replyToken, session, params.count ?? '');
    }

    case 'CONFIRM_BOOKING': {
      const session = await getSession(userId);
      if (!session || session.step !== 'CONFIRM') {
        await client.replyMessage({
          replyToken,
          messages: [buildTextMessage('ไม่พบข้อมูลการจองค่ะ กรุณาเริ่มใหม่อีกครั้ง')],
        });
        return;
      }
      // Try to get LINE display name
      let displayName: string | undefined;
      try {
        const profile = await client.getProfile(userId);
        displayName = profile.displayName;
      } catch {
        // Non-critical
      }
      return confirmBooking(replyToken, session, displayName);
    }

    case 'CANCEL_BOOKING': {
      const { clearSession } = await import('@/lib/session');
      await clearSession(userId);
      await client.replyMessage({
        replyToken,
        messages: [buildTextMessage('ยกเลิกการจองแล้วค่ะ 😊 หากต้องการจองใหม่ กด "จองห้องพัก" ได้เลยนะคะ')],
      });
      break;
    }

    case 'SHOW_ROOMS': {
      const { getRooms } = await import('@/lib/notion');
      const rooms = await getRooms();
      const list = rooms
        .filter((r) => r.available)
        .map((r) => `🛏 ${r.name}\n   ราคา: ${r.price.toLocaleString()} บาท/คืน\n   ${r.description}`)
        .join('\n\n');
      await client.replyMessage({
        replyToken,
        messages: [buildTextMessage(list || 'ไม่มีข้อมูลห้องพักในขณะนี้ค่ะ')],
      });
      break;
    }

    case 'SHOW_CONTACT':
      await client.replyMessage({
        replyToken,
        messages: [
          buildTextMessage(
            `📞 ติดต่อ ${process.env.HOTEL_NAME ?? 'Life Hotel'}\n\n` +
            `โทรศัพท์: ${process.env.HOTEL_PHONE ?? ''}\n` +
            `LINE ID: ${process.env.HOTEL_LINE_ID ?? ''}\n` +
            `ที่อยู่: ${process.env.HOTEL_ADDRESS ?? ''}\n\n` +
            `เปิดให้บริการ 24 ชั่วโมง 🕐`
          ),
        ],
      });
      break;

    default:
      await client.replyMessage({
        replyToken,
        messages: [buildTextMessage('ขออภัยค่ะ ไม่รู้จักคำสั่งนี้ กรุณาลองใหม่อีกครั้ง')],
      });
  }
}
