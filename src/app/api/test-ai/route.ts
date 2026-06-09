import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

export async function GET() {
  const apiKey = process.env.OPENAI_API_KEY ?? '';
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Reply with "OK" only.' }],
      max_tokens: 10,
    });
    return NextResponse.json({ ok: true, model: 'gpt-4o-mini', text: response.choices[0]?.message?.content });
  } catch (err: any) {
    return NextResponse.json({ ok: false, status: err?.status, message: err?.message?.slice(0, 200) });
  }
}
