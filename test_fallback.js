import { GoogleGenerativeAI } from '@google/generative-ai';

// Mocking the behavior for testing
const mockGenAI = {
  getGenerativeModel: ({ model }) => {
    return {
      generateContent: async (prompt) => {
        if (model === 'gemini-2.5-flash-lite' || model === 'gemini-2.5-flash') {
          throw new Error('RESOURCE_EXHAUSTED: 429 Too Many Requests');
        } else if (model === 'gemini-1.5-flash') {
          // Success!
          return { response: { text: () => 'Mock response from 1.5-flash' } };
        } else {
          throw new Error('[404 Not Found] model is not found');
        }
      }
    };
  }
};

const runTest = async () => {
  const modelsToTry = [
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-flash-lite-latest',
    'gemini-flash-latest'
  ];

  let lastError;
  let finalResponse = null;

  for (const modelName of modelsToTry) {
    console.log(`Trying model: ${modelName}...`);
    try {
      const model = mockGenAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("test prompt");
      
      console.log(`✅ Success with model ${modelName}:`, result.response.text());
      finalResponse = result.response.text();
      break; // Exit loop on success
    } catch (error) {
      console.error(`❌ Error with model ${modelName}:`, error.message);
      lastError = error;
      
      const rawMessage = error?.message ?? '';
      if (
        rawMessage.includes('404') ||
        rawMessage.includes('not found') ||
        rawMessage.includes('not valid') ||
        rawMessage.includes('503') ||
        rawMessage.includes('500')
      ) {
        console.log('   -> Falling back to next model...');
        continue;
      }
      
      console.log('   -> Fatal error, breaking loop.');
      break;
    }
  }

  if (finalResponse) {
    console.log('\nResult: Fallback succeeded!');
  } else {
    console.log('\nResult: All models failed.');
  }
};

runTest();
