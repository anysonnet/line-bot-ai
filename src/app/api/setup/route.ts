import { NextRequest, NextResponse } from 'next/server';
import { messagingApi } from '@line/bot-sdk';

export const runtime = 'nodejs';

// Call GET /api/setup?secret=SETUP_SECRET to create the Rich Menu
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = new messagingApi.MessagingApiClient({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
  });

  try {
    // Create Rich Menu
    const richMenuResponse = await client.createRichMenu({
      size: { width: 2500, height: 843 },
      selected: true,
      name: 'Life Hotel Main Menu',
      chatBarText: 'เมนู Life Hotel',
      areas: [
        {
          bounds: { x: 0, y: 0, width: 833, height: 843 },
          action: { type: 'postback', data: 'action=START_BOOKING', displayText: 'จองห้องพัก' },
        },
        {
          bounds: { x: 833, y: 0, width: 834, height: 843 },
          action: { type: 'postback', data: 'action=SHOW_ROOMS', displayText: 'ดูห้องพัก' },
        },
        {
          bounds: { x: 1667, y: 0, width: 833, height: 843 },
          action: {
            type: 'uri',
            uri: `https://maps.google.com/?q=${encodeURIComponent(process.env.HOTEL_ADDRESS ?? 'Life Hotel')}`,
          },
        },
        // Second row — only if image supports 6-area layout
        // Uncomment when using 2500x1686 image:
        // { bounds: { x: 0, y: 843, width: 833, height: 843 }, action: { type: 'postback', data: 'action=SHOW_FACILITIES', displayText: 'สิ่งอำนวยความสะดวก' } },
        // { bounds: { x: 833, y: 843, width: 834, height: 843 }, action: { type: 'message', text: 'โปรโมชั่น' } },
        // { bounds: { x: 1667, y: 843, width: 833, height: 843 }, action: { type: 'postback', data: 'action=SHOW_CONTACT', displayText: 'ติดต่อเรา' } },
      ],
    } as any);

    const richMenuId = richMenuResponse.richMenuId;

    // Set as default Rich Menu
    await client.setDefaultRichMenu(richMenuId);

    return NextResponse.json({
      ok: true,
      richMenuId,
      message: 'Rich Menu created. Now upload an image at POST /api/setup/rich-menu-image',
      note: 'Upload image (2500x843 JPG/PNG) via LINE Messaging API: POST https://api-data.line.me/v2/bot/richmenu/{richMenuId}/content',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
