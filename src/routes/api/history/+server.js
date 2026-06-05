import { json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';

/** @type {import('./$types').RequestHandler} */
export async function GET({ request }) {
  try {
    const username = request.headers.get('x-username');
    if (!username) {
      return json({ error: 'Username missing' }, { status: 400 });
    }

    const dataDir = path.join(process.cwd(), 'data');
    await fs.mkdir(dataDir, { recursive: true });
    
    const userFilePath = path.join(dataDir, `${username}.json`);
    
    try {
      const content = await fs.readFile(userFilePath, 'utf-8');
      const data = JSON.parse(content);
      
      let historyList = [];
      if (data.chats && Array.isArray(data.chats)) {
        historyList = data.chats.map((/** @type {any} */ c) => ({
          id: c.id,
          title: c.title,
          updatedAt: c.updatedAt
        }));
      }
      
      // Sort by latest first
      historyList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      return json(historyList);
      
    } catch(e) {
      // File doesn't exist yet, return empty history
      return json([]);
    }
  } catch (error) {
    console.error('Error fetching history:', error);
    return json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
