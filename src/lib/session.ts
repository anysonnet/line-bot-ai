import { Client, isFullPage } from '@notionhq/client';
import type { BookingSession } from '@/types';

// In-memory cache (warm for serverless duration)
const cache = new Map<string, BookingSession>();

let notion: Client | null = null;

function getNotion(): Client | null {
  if (!process.env.NOTION_SESSIONS_DB_ID) return null;
  if (!notion) notion = new Client({ auth: process.env.NOTION_API_KEY! });
  return notion;
}

export async function getSession(userId: string): Promise<BookingSession | null> {
  if (cache.has(userId)) return cache.get(userId)!;

  const client = getNotion();
  if (!client) return null;

  try {
    const response = await client.databases.query({
      database_id: process.env.NOTION_SESSIONS_DB_ID!,
      filter: { property: 'User ID', title: { equals: userId } },
    });

    const page = response.results.find(isFullPage);
    if (!page) return null;

    const data = (page.properties as Record<string, any>)['Data']?.rich_text?.[0]?.plain_text;
    if (!data) return null;

    const session = JSON.parse(data) as BookingSession;
    cache.set(userId, session);
    return session;
  } catch (error) {
    console.error('getSession error:', error);
    return null;
  }
}

export async function saveSession(session: BookingSession): Promise<void> {
  cache.set(session.userId, session);

  const client = getNotion();
  if (!client) return;

  try {
    const existing = await client.databases.query({
      database_id: process.env.NOTION_SESSIONS_DB_ID!,
      filter: { property: 'User ID', title: { equals: session.userId } },
    });

    const properties = {
      'User ID': { title: [{ text: { content: session.userId } }] },
      'Step': { select: { name: session.step } },
      'Data': { rich_text: [{ text: { content: JSON.stringify(session) } }] },
      'Updated At': { date: { start: new Date().toISOString() } },
    };

    const existingPage = existing.results.find(isFullPage);
    if (existingPage) {
      await client.pages.update({ page_id: existingPage.id, properties });
    } else {
      await client.pages.create({
        parent: { database_id: process.env.NOTION_SESSIONS_DB_ID! },
        properties,
      });
    }
  } catch (error) {
    console.error('saveSession error:', error);
  }
}

export async function clearSession(userId: string): Promise<void> {
  cache.delete(userId);

  const client = getNotion();
  if (!client) return;

  try {
    const existing = await client.databases.query({
      database_id: process.env.NOTION_SESSIONS_DB_ID!,
      filter: { property: 'User ID', title: { equals: userId } },
    });

    for (const page of existing.results.filter(isFullPage)) {
      await client.pages.update({ page_id: page.id, archived: true });
    }
  } catch (error) {
    console.error('clearSession error:', error);
  }
}
