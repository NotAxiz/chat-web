import { json } from '@sveltejs/kit';
import fs from 'fs/promises';
import path from 'path';

/** @type {import('./$types').RequestHandler} */
export async function GET({ request }) {
  try {
    const username = request.headers.get('x-username');
    if (!username) return json({ error: 'Username missing' }, { status: 400 });

    const userFilePath = path.join(process.cwd(), 'data', `${username}.json`);
    const data = await fs.readFile(userFilePath, 'utf8');
    const parsed = JSON.parse(data);
    return json(parsed.settings || {});
  } catch (err) {
    const error = /** @type {any} */ (err);
    if (error.code === 'ENOENT') {
      return json({});
    }
    console.error('Error reading settings:', err);
    return json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
  try {
    const username = request.headers.get('x-username');
    if (!username) return json({ error: 'Username missing' }, { status: 400 });

    const settings = await request.json();

    const dataDir = path.join(process.cwd(), 'data');
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }

    const userFilePath = path.join(dataDir, `${username}.json`);
    let currentData = { username, chats: [], settings: {} };
    try {
      const data = await fs.readFile(userFilePath, 'utf8');
      currentData = JSON.parse(data);
    } catch (e) {
      // Ignore if file doesn't exist
    }

    currentData.settings = { ...(currentData.settings || {}), ...settings };

    await fs.writeFile(userFilePath, JSON.stringify(currentData, null, 2));

    return json({ success: true });
  } catch (err) {
    console.error('Settings API Error:', err);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
