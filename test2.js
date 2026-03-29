import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
const genAI = new GoogleGenerativeAI('AIzaSyD3QzaCVxc6tsqF_1yFxu3N6Wvp_NyurHo');
try {
  await genAI.getGenerativeModel({model: 'gemini-2.0-flash'}).generateContent('hello');
} catch (e) {
  fs.writeFileSync('err.txt', e.message, 'utf8');
}
