import { NextRequest, NextResponse } from 'next/server';
import type { WebhookRequestBody, WebhookEvent } from '@line/bot-sdk';
import { verifyLineSignature } from '@/lib/line';
import { handleTextMessage } from '@/handlers/message';
import { handlePostback } from '@/handlers/postback';
import { handleFollow } from '@/handlers/follow';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-line-signature') ?? '';

  if (!verifyLineSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let body: WebhookRequestBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  await Promise.all((body.events ?? []).map(handleEvent));

  return NextResponse.json({ ok: true });
}

async function handleEvent(event: WebhookEvent): Promise<void> {
  try {
    switch (event.type) {
      case 'message':
        if (event.message.type === 'text') {
          await handleTextMessage(event);
        }
        break;
      case 'postback':
        await handlePostback(event);
        break;
      case 'follow':
      case 'join':
        await handleFollow(event as any);
        break;
    }
  } catch (error) {
    console.error(`Error handling event [${event.type}]:`, error);
  }
}
