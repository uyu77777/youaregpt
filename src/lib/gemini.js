const buildApiCandidates = () => {
  // In Vercel and local dev (via proxy), /api/chat is the standard path.
  // We prioritize it to avoid CORS issues and simplify deployment.
  return ['/api/chat'];
};

const readErrorMessage = async (response) => {
  try {
    const errorData = await response.json();
    return errorData.detail ? `${errorData.error}\n\n${errorData.detail}` : (errorData.error || `Server returned ${response.status}.`);
  } catch {
    return `Server returned ${response.status}.`;
  }
};

export const generateAIResponse = async (input, level, history) => {
  const payload = JSON.stringify({ input, level, history });
  const apiCandidates = buildApiCandidates();
  let lastError = null;

  for (const url of apiCandidates) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const data = await response.json();
      return data.text;
    } catch (error) {
      lastError = error;
      console.error(`Backend API Error via ${url}:`, error);
    }
  }

  throw lastError ?? new Error('Failed to contact the backend API.');
};
