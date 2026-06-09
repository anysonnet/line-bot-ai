import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY ?? '';
  if (!apiKey) return NextResponse.json({ error: 'No Gemini API key set' }, { status: 500 });

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: 'Reply with "OK" only.' }] }],
    });
    return NextResponse.json({ ok: true, model: 'gemini-2.0-flash', text: response.text });
  } catch (err: any) {
    return NextResponse.json({ ok: false, status: err?.status, message: err?.message?.slice(0, 200) });
  }
}
