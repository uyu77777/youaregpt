import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI('AIzaSyD3QzaCVxc6tsqF_1yFxu3N6Wvp_NyurHo');

async function test(modelName) {
  try {
    const res = await genAI.getGenerativeModel({model: modelName}).generateContent('hello');
    console.log(modelName, 'SUCCESS:', res.response.text());
  } catch (e) {
    console.log(modelName, 'ERROR MESSAGE:', e.message);
    console.log('---JSON---');
    console.log(JSON.stringify(e, null, 2));
  }
}

await test('gemini-2.0-flash');
