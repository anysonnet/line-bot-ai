import { messagingApi, validateSignature } from '@line/bot-sdk';

let client: messagingApi.MessagingApiClient | null = null;

export function getLineClient(): messagingApi.MessagingApiClient {
  if (!client) {
    client = new messagingApi.MessagingApiClient({
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
    });
  }
  return client;
}

export function verifyLineSignature(rawBody: string, signature: string): boolean {
  return validateSignature(rawBody, process.env.LINE_CHANNEL_SECRET!, signature);
}

export function buildQuickReply(
  items: Array<{ label: string; data: string; displayText?: string }>
): messagingApi.QuickReply {
  return {
    items: items.map((item) => ({
      type: 'action',
      action: {
        type: 'postback',
        label: item.label,
        data: item.data,
        displayText: item.displayText ?? item.label,
      } as messagingApi.PostbackAction,
    })),
  };
}

export function buildTextMessage(
  text: string,
  quickReply?: messagingApi.QuickReply
): messagingApi.TextMessage {
  return {
    type: 'text',
    text,
    ...(quickReply && { quickReply }),
  };
}
