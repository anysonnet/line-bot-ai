import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY ?? '';
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });

  const ai = new GoogleGenAI({ apiKey });

  // Try models in order, return first success
  const candidates = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash-001',
    'gemini-pro',
  ];

  const results: Record<string, any> = {};

  for (const model of candidates) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: 'Reply with "OK" only.' }] }],
      });
      return NextResponse.json({ ok: true, model, text: response.text });
    } catch (err: any) {
      results[model] = { status: err?.status, message: err?.message?.slice(0, 120) };
    }
  }

  return NextResponse.json({ ok: false, results });
}
