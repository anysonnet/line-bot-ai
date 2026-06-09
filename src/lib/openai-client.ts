import OpenAI from 'openai';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  }
  return client;
}

export async function generateResponseOpenAI(
  message: string,
  systemPrompt: string
): Promise<string> {
  const response = await getClient().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ],
    max_tokens: 512,
    temperature: 0.7,
  });
  return response.choices[0]?.message?.content ?? 'ขออภัยค่ะ ไม่สามารถตอบได้ในขณะนี้ 🙏';
}
