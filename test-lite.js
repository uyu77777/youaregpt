import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
const genAI = new GoogleGenerativeAI('AIzaSyD3QzaCVxc6tsqF_1yFxu3N6Wvp_NyurHo');
try {
  const result = await genAI.getGenerativeModel({model: 'gemini-2.5-flash-lite'}).generateContent('hello');
  console.log('SUCCESS:', result.response.text());
} catch (e) {
  console.log('ERROR:', e.message);
}
