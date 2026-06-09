import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY ?? '';
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });

  const keyInfo = { length: apiKey.length, prefix: apiKey.slice(0, 7) };

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 20,
      messages: [{ role: 'user', content: 'Reply with "OK" only.' }],
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ ok: true, model: 'claude-haiku-4-5', text, keyInfo });
  } catch (err: any) {
    return NextResponse.json({ ok: false, status: err?.status, message: err?.message?.slice(0, 200), keyInfo });
  }
}
