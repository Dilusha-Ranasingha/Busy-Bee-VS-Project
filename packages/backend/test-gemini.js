// Quick test script to verify Gemini API is working
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

async function testGemini() {
  console.log('🧪 Testing Gemini API Connection...\n');
  
  const apiKey = process.env.GEMINI_API_KEY;
  
  console.log('Step 1: Check API Key');
  if (!apiKey || apiKey.trim() === '') {
    console.error('❌ GEMINI_API_KEY not found in environment');
    console.log('   Please check your .env file');
    process.exit(1);
  }
  console.log(`✅ API Key found (${apiKey.length} characters)\n`);
  
  console.log('Step 2: Initialize Gemini with new @google/genai package');
  const ai = new GoogleGenAI({ apiKey });
  console.log('✅ Gemini initialized\n');
  
  // Try different current model names
  const modelsToTry = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'];
  
  console.log('Step 3: Testing model names...\n');
  
  for (const modelName of modelsToTry) {
    console.log(`Trying model: ${modelName}`);
    try {
      const res = await ai.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts: [{ text: 'Say OK' }] }],
      });
      
      const text = res.text;
      console.log(`✅ SUCCESS with model: ${modelName}`);
      console.log(`   Response: "${text}"\n`);
      
      console.log('🎉 Gemini API is working correctly!');
      console.log(`✅ Use this model name: "${modelName}"\n`);
      
      console.log('Now test the scoring endpoint:');
      console.log('curl -X POST http://localhost:4000/api/daily-metrics/trigger \\');
      console.log('  -H "Content-Type: application/json" \\');
      console.log('  -d \'{"date": "2026-01-06", "includeScoring": true}\'');
      
      return; // Exit on first success
      
    } catch (error) {
      const errorMsg = error?.message || error;
      console.log(`   ❌ Failed: ${errorMsg.toString().split('\n')[0]}\n`);
    }
  }
  
  console.error('❌ All models failed!');
  console.error('\n💡 Your API key may be:');
  console.error('   1. Invalid or expired');
  console.error('   2. Not have access to Gemini models');
  console.error('   3. From wrong service (use Google AI Studio, not Cloud Console)');
  console.error('\n   Get a new key at: https://aistudio.google.com/app/apikey');
  process.exit(1);
}

testGemini().catch((e) => {
  console.error('❌ Error:', e?.message || e);
  process.exit(1);
});
