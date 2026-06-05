import { GoogleGenerativeAI } from '@google/generative-ai';

async function listModels() {
  const apiKey = 'AIzaSyBcHXCkJgRGvyvDw9DafSxGG2VFzikEzJU';
  
  if (!apiKey) {
    console.error('API key is missing.');
    return;
  }
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error fetching models:', err);
  }
}

listModels();
