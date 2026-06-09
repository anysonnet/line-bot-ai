import type { FollowEvent } from '@line/bot-sdk';
import { getLineClient, buildTextMessage, buildQuickReply } from '@/lib/line';

export async function handleFollow(event: FollowEvent): Promise<void> {
  const client = getLineClient();

  let displayName = 'ลูกค้า';
  try {
    if (event.source.userId) {
      const profile = await client.getProfile(event.source.userId);
      displayName = profile.displayName;
    }
  } catch {
    // Non-critical
  }

  const welcomeMsg = [
    `สวัสดีค่ะ คุณ${displayName}! 🏨`,
    '',
    `ยินดีต้อนรับสู่ ${process.env.HOTEL_NAME ?? 'Life Hotel'}`,
    'ผู้ช่วย AI ของเราพร้อมให้บริการตลอด 24 ชั่วโมง ✨',
    '',
    'บริการของเรา:',
    '🛏 จองห้องพัก',
    '📋 ข้อมูลห้องพักและราคา',
    '🏊 สิ่งอำนวยความสะดวก',
    '📍 ที่ตั้งและการเดินทาง',
    '📞 ติดต่อเจ้าหน้าที่',
    '',
    'สามารถพิมพ์ถามได้เลยค่ะ หรือเลือกบริการด้านล่าง 👇',
  ].join('\n');

  await client.replyMessage({
    replyToken: event.replyToken,
    messages: [
      buildTextMessage(
        welcomeMsg,
        buildQuickReply([
          { label: '🛏 จองห้องพัก', data: 'action=START_BOOKING', displayText: 'จองห้องพัก' },
          { label: '📋 ดูห้องพัก', data: 'action=SHOW_ROOMS', displayText: 'ดูห้องพัก' },
          { label: '📞 ติดต่อเรา', data: 'action=SHOW_CONTACT', displayText: 'ติดต่อเรา' },
        ])
      ),
    ],
  });
}
