import { OpenAIEdgeStream } from 'openai-edge-stream';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  try {
    const { message } = await req.json();
    const origin = req.headers.get('origin');
    const response = await fetch(`${origin}/api/chat/createNewChat`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: req.headers.get('cookie'),
      },
      body: JSON.stringify({ message }),
    });
    const json = await response.json();
    const chatId = json._id;

    const stream = await OpenAIEdgeStream(
      'https://api.openai.com/v1/chat/completions',
      {
        headers: {
          'content-type': 'application/json',
          Authorization: `Bearer ${process.env.OPEN_API_KEY}`,
        },
        method: 'POST',
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ content: message, role: 'user' }],
          stream: true,
        }),
      },
      {
        onBeforeStream: ({ emit }) => {
          emit(chatId, 'newChatId');
        },
        onAfterStream: async ({ fullContent }) => {
          const addMessageUrl = `${origin}/api/chat/addMessageToChat`;
          console.log(`Attempting to call: ${addMessageUrl}`);
          const addMessageResponse = await fetch(addMessageUrl, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              cookie: req.headers.get('cookie'),
            },
            body: JSON.stringify({
              chatId,
              role: 'assistant',
              content: fullContent,
            }),
          });
          if (!addMessageResponse.ok) {
            console.error(
              `Failed to call ${addMessageUrl}: ${addMessageResponse.statusText}`,
            );
          }
        },
      },
    );
    return new Response(stream);
  } catch (e) {
    console.error('An error occurred in sendMessage API: ', e);
  }
}
