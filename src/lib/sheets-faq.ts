import type { FAQ } from '@/types';

let faqCache: FAQ[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getFAQsFromSheet(): Promise<FAQ[]> {
  const url = process.env.SHEET_CSV_URL;
  if (!url) return [];

  const now = Date.now();
  if (faqCache && now - cacheTime < CACHE_TTL) return faqCache;

  try {
    const res = await fetch(url);
    const text = await res.text();

    const rows = text
      .split('\n')
      .slice(1) // skip header row
      .map((line) => {
        // Handle CSV with possible quoted fields
        const cols = line.match(/(".*?"|[^,]+)(?=,|$)/g) ?? [];
        const clean = (s: string) => s?.replace(/^"|"$/g, '').trim() ?? '';
        return {
          question: clean(cols[0] ?? ''),
          answer: clean(cols[1] ?? ''),
          category: clean(cols[2] ?? 'General'),
        } as FAQ;
      })
      .filter((f) => f.question && f.answer);

    faqCache = rows;
    cacheTime = now;
    return rows;
  } catch (error) {
    console.error('getFAQsFromSheet error:', error);
    return faqCache ?? [];
  }
}

export function buildFAQContext(faqs: FAQ[], query: string): string {
  if (faqs.length === 0) return '';
  const lower = query.toLowerCase();
  const relevant = faqs
    .filter((f) => f.question.toLowerCase().includes(lower.slice(0, 15)) || lower.includes(f.question.slice(0, 15).toLowerCase()))
    .slice(0, 5);
  if (relevant.length === 0) return faqs.slice(0, 5).map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
  return relevant.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
}
