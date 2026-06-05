import { json } from '@sveltejs/kit';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
  try {
    const { messages, chatId } = await request.json();
    const id = chatId || crypto.randomUUID();
    const username = request.headers.get('x-username');
    
    if (!username) {
      return json({ error: 'Username missing' }, { status: 400 });
    }

    const dataDir = path.join(process.cwd(), 'data');
    const userFilePath = path.join(dataDir, `${username}.json`);
    let userData = { username, chats: [], settings: {} };
    try {
      const existing = await fs.readFile(userFilePath, 'utf-8');
      userData = JSON.parse(existing);
    } catch(e) {
      // File doesn't exist yet
    }

    // Use user's API key if saved, else fallback
    const apiKey = userData.settings?.apiKey || 'AIzaSyBcHXCkJgRGvyvDw9DafSxGG2VFzikEzJU';

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    
    const now = new Date();
    const defaultSystemPrompt = `You are Nexus AI, a highly advanced, premium AI assistant built by a talented developer.
Here are the current system variables you have access to:
- CURRENT_DATE: ${now.toLocaleDateString('en-IN')}
- CURRENT_TIME: ${now.toLocaleTimeString('en-IN')}
- DAY_OF_WEEK: ${now.toLocaleDateString('en-IN', { weekday: 'long' })}
- TIMEZONE: Asia/Kolkata (IST)

Instructions for your behavior:
1. You are brilliant, friendly, and deeply knowledgeable.
2. Use Markdown elegantly and naturally. Use bold text for emphasis, bullet points for lists, and code blocks for code, but only when it makes the response easier to read. Do not over-format.
3. If the user asks about the time or day, use the variables provided above.
4. Speak in a conversational, helpful tone. Avoid being overly robotic or excessively structured unless asked to provide a formal report.
5. If you provide code, ensure it is well-commented and accurate.`;

    const systemPrompt = userData.settings?.systemPrompt || defaultSystemPrompt;

    const model = genAI.getGenerativeModel({ 
      model: userData.settings?.model || "gemini-2.0-flash",
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: parseFloat(userData.settings?.temperature ?? 0.7),
        topP: parseFloat(userData.settings?.topP ?? 0.9),
        topK: parseInt(userData.settings?.topK ?? 40),
        maxOutputTokens: parseInt(userData.settings?.maxTokens ?? 2048),
      }
    });

    // Format history for Gemini API
    let history = messages.slice(0, -1).map((/** @type {any} */ msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const firstUserIndex = history.findIndex((/** @type {any} */ msg) => msg.role === 'user');
    if (firstUserIndex !== -1) {
      history = history.slice(firstUserIndex);
    } else {
      history = [];
    }

    const latestMessage = messages[messages.length - 1].content;
    const chat = model.startChat({ history: history });

    // Use sendMessageStream instead of sendMessage
    const result = await chat.sendMessageStream(latestMessage);

    let fullText = "";

    const stream = new ReadableStream({
      async start(controller) {
        // Send the chatId first
        controller.enqueue(new TextEncoder().encode(JSON.stringify({ type: 'id', chatId: id }) + '\n'));
        
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullText += chunkText;
            controller.enqueue(new TextEncoder().encode(JSON.stringify({ type: 'text', text: chunkText }) + '\n'));
          }
        } catch (err) {
          const e = /** @type {Error} */ (err);
          console.error("Stream Error:", e);
          controller.enqueue(new TextEncoder().encode(JSON.stringify({ type: 'error', error: e.message }) + '\n'));
        }
        
        // Save history after streaming finishes
        try {
          const updatedMessages = [...messages, { role: 'assistant', content: fullText }];
          const dataDir = path.join(process.cwd(), 'data');
          await fs.mkdir(dataDir, { recursive: true });
          // userData is already loaded above

          
          if (!userData.chats) userData.chats = [];
          
          const firstUserMsg = updatedMessages.find((/** @type {any} */ m) => m.role === 'user');
          const title = firstUserMsg ? firstUserMsg.content.substring(0, 30) + '...' : 'New Chat';
          const chatData = { id, title, updatedAt: new Date().toISOString(), messages: updatedMessages };
          
          const existingChatIndex = userData.chats.findIndex((/** @type {any} */ c) => c.id === id);
          if (existingChatIndex >= 0) {
            userData.chats[existingChatIndex] = chatData;
          } else {
            userData.chats.push(chatData);
          }
          
          await fs.writeFile(userFilePath, JSON.stringify(userData, null, 2));
        } catch (fsErr) {
          console.error("History Save Error:", fsErr);
        }
        
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    const e = /** @type {any} */ (error);
    console.error('Chat API Error:', e);
    
    // Rate limit — friendly message
    if (e.status === 429) {
      return json({ error: 'Rate limit reached. Please wait a few seconds and try again.' }, { status: 429 });
    }
    
    return json({ error: e.message || 'Failed to process chat message.' }, { status: 500 });
  }
}
