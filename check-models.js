import dotenv from 'dotenv';
dotenv.config();

async function checkModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.models) {
      console.log('Available models:');
      data.models.forEach(m => console.log(`- ${m.name.replace('models/', '')}`));
    } else {
      console.error('Failed to parse models:', data);
    }
  } catch (error) {
    console.error('Error fetching models:', error);
  }
}

checkModels();
