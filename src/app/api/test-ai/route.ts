import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

export async function GET() {
  const apiKey = process.env.OPENCODE_API_KEY ?? '';
  if (!apiKey) return NextResponse.json({ error: 'OPENCODE_API_KEY not set' }, { status: 500 });

  const keyInfo = { length: apiKey.length, prefix: apiKey.slice(0, 7) };

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: 'https://opencode.ai/zen/go/v1',
    });
    const response = await client.chat.completions.create({
      model: 'deepseek-v4-flash',
      max_tokens: 20,
      messages: [{ role: 'user', content: 'Reply with "OK" only.' }],
    });
    const text = response.choices[0]?.message?.content ?? '';
    return NextResponse.json({ ok: true, model: 'deepseek-v4-flash', text, keyInfo });
  } catch (err: any) {
    return NextResponse.json({ ok: false, status: err?.status, message: err?.message?.slice(0, 200), keyInfo });
  }
}
