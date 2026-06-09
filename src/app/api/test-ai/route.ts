import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY ?? '';
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });

  // Try both v1beta (default) and v1 API versions
  const configs = [
    { ai: new GoogleGenAI({ apiKey }), label: 'v1beta' },
    { ai: new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1' } } as any), label: 'v1' },
  ];

  const candidates = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
  ];

  const results: Record<string, any> = {};

  for (const { ai, label } of configs) {
    for (const model of candidates) {
      const key = `${label}/${model}`;
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: 'Reply with "OK" only.' }] }],
        });
        return NextResponse.json({ ok: true, apiVersion: label, model, text: response.text });
      } catch (err: any) {
        results[key] = { status: err?.status, message: err?.message?.slice(0, 100) };
      }
    }
  }

  return NextResponse.json({ ok: false, results });
}
