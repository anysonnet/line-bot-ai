import type { MessageEvent } from '@line/bot-sdk';
import { getLineClient, buildTextMessage } from '@/lib/line';
import { generateResponse } from '@/lib/gemini';
import { getHotelContext } from '@/lib/notion';
import { getSession } from '@/lib/session';
import { startBookingFlow, handleBookingStep } from './booking';

const BOOKING_KEYWORDS = ['จอง', 'จองห้อง', 'ต้องการจอง', 'อยากจอง', 'book', 'booking', 'reserve'];
const ROOM_INFO_KEYWORDS = ['ห้องพัก', 'ห้อง', 'ราคา', 'price', 'room'];
const FACILITY_KEYWORDS = ['สิ่งอำนวย', 'บริการ', 'facility', 'facilities', 'สระว่ายน้ำ', 'ร้านอาหาร', 'ฟิตเนส'];

export async function handleTextMessage(event: MessageEvent): Promise<void> {
  if (event.message.type !== 'text') return;
  if (!event.source.userId) return;

  const userId = event.source.userId;
  const text = event.message.text.trim();
  const replyToken = event.replyToken;
  const client = getLineClient();

  // Show loading animation while processing
  try {
    await client.showLoadingAnimation({ chatId: userId, loadingSeconds: 5 });
  } catch {
    // Not critical if this fails
  }

  // Check active booking session
  const session = await getSession(userId);
  if (session) {
    return handleBookingStep(replyToken, session, text);
  }

  // Booking intent detection
  const lowerText = text.toLowerCase();
  if (BOOKING_KEYWORDS.some((kw) => lowerText.includes(kw))) {
    return startBookingFlow(replyToken, userId);
  }

  // Fetch hotel context for better AI responses
  let context = '';
  if (
    ROOM_INFO_KEYWORDS.some((kw) => lowerText.includes(kw)) ||
    FACILITY_KEYWORDS.some((kw) => lowerText.includes(kw))
  ) {
    context = await getHotelContext(text);
  }

  // AI response via Gemini
  const response = await generateResponse(text, context);

  await client.replyMessage({
    replyToken,
    messages: [buildTextMessage(response)],
  });
}
