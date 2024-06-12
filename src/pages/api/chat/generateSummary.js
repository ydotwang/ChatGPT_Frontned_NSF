import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPEN_API_KEY,
});

export const config = {
  runtime: 'edge',
};

async function summarizeChatHistory(chatMessages) {
  const prompt = chatMessages
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `
        Chat history:
${prompt}
        Based on the following chat history, provide a summary of the user experience in less than 100 words, focusing on the flow of the conversation from the user's perspective. Make it sound like a human explaining the interaction and dont use the word user, say "you" instead of user and say "chatgpt" instead of assistant. Dont use the word 'userexperience' . Keep the tone, spartan and  unbiased and neutral to reflect true user experience. Dont use filler words and do not be biased towards chatGPT!:

`,
      },
    ],
    model: 'gpt-3.5-turbo-16k-0613',
    max_tokens: 200,
  });
  return (
    completion.choices[0]?.message?.content.trim() ||
    'Summary could not be generated.'
  );
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { messages } = await req.json();
    const summary = await summarizeChatHistory(messages);
    return new Response(JSON.stringify({ summary }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('An error occurred in generateSummary API: ', e);
    return new Response(
      JSON.stringify({ error: 'Failed to generate summary' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
