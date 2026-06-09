import type { MessageEvent } from '@line/bot-sdk';
import { getLineClient, buildTextMessage } from '@/lib/line';
import { generateResponse } from '@/lib/ai';
import { getHotelContext } from '@/lib/notion';
import { getFAQsFromSheet, buildFAQContext } from '@/lib/sheets-faq';
import { getSession } from '@/lib/session';
import { startBookingFlow, handleBookingStep } from './booking';

const BOOKING_KEYWORDS = ['จอง', 'จองห้อง', 'ต้องการจอง', 'อยากจอง', 'book', 'booking', 'reserve'];

export async function handleTextMessage(event: MessageEvent): Promise<void> {
  if (event.message.type !== 'text') return;
  if (!event.source.userId) return;

  const userId = event.source.userId;
  const text = event.message.text.trim();
  const replyToken = event.replyToken;
  const client = getLineClient();

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

  // Build context: FAQ from Google Sheet + room data from Notion (fallback)
  const [faqs, hotelContext] = await Promise.all([
    getFAQsFromSheet(),
    getHotelContext(text),
  ]);
  const faqContext = buildFAQContext(faqs, text);
  const context = [faqContext, hotelContext].filter(Boolean).join('\n\n');

  const response = await generateResponse(text, context);

  await client.replyMessage({
    replyToken,
    messages: [buildTextMessage(response)],
  });
}
