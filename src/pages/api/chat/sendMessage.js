import { OpenAIEdgeStream } from 'openai-edge-stream';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  try {
    const { chatId: chatIdFromParam, message } = await req.json();
    let chatId = chatIdFromParam;
    const origin = req.headers.get('origin');

    let newChatId;
    let chatMessages = [];

    if (chatId) {
      const response = await fetch(`${origin}/api/chat/addMessageToChat`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: req.headers.get('cookie'),
        },
        body: JSON.stringify({ chatId, role: 'user', content: message }),
      });
      const json = await response.json();
      chatMessages = json.chat.messages || [];
    } else {
      const response = await fetch(`${origin}/api/chat/createNewChat`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: req.headers.get('cookie'),
        },
        body: JSON.stringify({ message }),
      });
      const json = await response.json();
      chatId = json._id;
      newChatId = json._id;
      chatMessages = json.messages || [];
    }

    const messagesToInclude = [];
    chatMessages.reverse();

    let usedTokens = 0;

    for (let chatMessage of chatMessages) {
      const messageTokens = chatMessage.content.length / 4;
      usedTokens = usedTokens + messageTokens;
      if (usedTokens <= 2000) {
        messagesToInclude.push(chatMessage);
      } else {
        break;
      }
    }

    messagesToInclude.reverse();

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
          messages: [...messagesToInclude],
          stream: true,
        }),
      },
      {
        onBeforeStream: ({ emit }) => {
          if (newChatId) {
            emit(newChatId, 'newChatId');
          }
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
