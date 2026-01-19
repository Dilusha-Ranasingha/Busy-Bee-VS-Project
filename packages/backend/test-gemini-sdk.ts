import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';
console.log('Testing Gemini API with key:', apiKey.substring(0, 10) + '...');

const genAI = new GoogleGenAI({ apiKey });

async function test() {
  try {
    const result = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: 'Say hello!' }] }],
    });
    
    console.log('✅ Success!');
    console.log('Response:', result.text);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

test();
