import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY ?? '';

  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 });
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: 'Say "OK" only.' }] }],
    });
    return NextResponse.json({ ok: true, text: response.text });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      status: err?.status,
      code: err?.code,
      message: err?.message,
      details: err?.errorDetails ?? err?.details,
    });
  }
}
