import { json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params, request }) {
  try {
    const username = request.headers.get('x-username');
    if (!username) return json({ error: 'Username missing' }, { status: 400 });

    const { id } = params;
    const userFilePath = path.join(process.cwd(), 'data', `${username}.json`);
    
    const content = await fs.readFile(userFilePath, 'utf-8');
    const data = JSON.parse(content);
    
    if (data.chats) {
      const chat = data.chats.find((/** @type {any} */ c) => c.id === id);
      if (chat) {
        return json(chat);
      }
    }
    
    return json({ error: 'Chat not found' }, { status: 404 });
  } catch (err) {
    const error = /** @type {any} */ (err);
    if (error.code === 'ENOENT') {
      return json({ error: 'Chat not found' }, { status: 404 });
    }
    console.error(`Error fetching chat ${params.id}:`, error);
    return json({ error: 'Failed to fetch chat' }, { status: 500 });
  }
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE({ params, request }) {
  try {
    const username = request.headers.get('x-username');
    if (!username) return json({ error: 'Username missing' }, { status: 400 });

    const { id } = params;
    const userFilePath = path.join(process.cwd(), 'data', `${username}.json`);
    
    const content = await fs.readFile(userFilePath, 'utf-8');
    const data = JSON.parse(content);
    
    if (data.chats) {
      data.chats = data.chats.filter((/** @type {any} */ c) => c.id !== id);
      await fs.writeFile(userFilePath, JSON.stringify(data, null, 2));
    }
    
    return json({ success: true });
  } catch (error) {
    return json({ error: 'Failed to delete chat' }, { status: 500 });
  }
}
