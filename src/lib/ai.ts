import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return client;
}

const SYSTEM_PROMPT = `คุณคือผู้ช่วย AI ของ ${process.env.HOTEL_NAME ?? 'Life Hotel'} ช่วยลูกค้าผ่าน LINE Official Account

บทบาทของคุณ:
- ตอบคำถามเกี่ยวกับโรงแรม ห้องพัก บริการ และนโยบาย
- ช่วยในการจองห้องพัก
- ให้ข้อมูลสถานที่ท่องเที่ยวในบริเวณใกล้เคียง

ข้อมูลโรงแรม:
- ชื่อ: ${process.env.HOTEL_NAME ?? 'Life Hotel'}
- ที่อยู่: ${process.env.HOTEL_ADDRESS ?? 'กรุณาติดต่อสอบถาม'}
- โทรศัพท์: ${process.env.HOTEL_PHONE ?? 'กรุณาติดต่อสอบถาม'}
- LINE ID: ${process.env.HOTEL_LINE_ID ?? '@lifehotel'}
- เช็คอิน: 14:00 น.  เช็คเอาต์: 12:00 น.

กฎการตอบ:
- ตอบเป็นภาษาไทยเสมอ เว้นแต่ลูกค้าจะพิมพ์เป็นภาษาอังกฤษ
- ตอบสั้นกระชับ ไม่เกิน 3-4 ประโยค เหมาะสำหรับ LINE chat
- ใช้ภาษาสุภาพ เป็นมิตร
- ใช้ emoji เล็กน้อยให้ดูเป็นมิตร
- หากลูกค้าต้องการจองห้อง ให้บอกว่า "กรุณาพิมพ์ว่า 'จองห้อง' ได้เลยค่ะ"
- หากไม่แน่ใจในคำตอบ ให้แนะนำให้ติดต่อเจ้าหน้าที่โดยตรง`;

export async function generateResponse(
  message: string,
  hotelContext: string = ''
): Promise<string> {
  try {
    const system = hotelContext
      ? `${SYSTEM_PROMPT}\n\nข้อมูลเพิ่มเติมของโรงแรม:\n${hotelContext}`
      : SYSTEM_PROMPT;

    const response = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system,
      messages: [{ role: 'user', content: message }],
    });

    const block = response.content[0];
    return block.type === 'text' ? block.text : 'ขออภัยค่ะ ไม่สามารถตอบได้ในขณะนี้ 🙏';
  } catch (error: any) {
    console.error(`Claude error: status=${error?.status} msg=${error?.message}`);
    return 'ขออภัยค่ะ ระบบขัดข้องชั่วคราว กรุณาติดต่อเจ้าหน้าที่ที่ ' + (process.env.HOTEL_PHONE ?? '');
  }
}
