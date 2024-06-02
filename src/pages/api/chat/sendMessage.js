import { OpenAIEdgeStream } from 'openai-edge-stream';

export const config = {
  runtime: 'edge',
};

async function summarizeChatHistory(chatMessages) {
  const prompt = chatMessages
    .map(msg => `${msg.role}: ${msg.content}`)
    .join('\n');
  const response = await fetch('https://api.openai.com/v1/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPEN_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'text-davinci-003',
      prompt: `Summarize the following chat history:\n${prompt}`,
      max_tokens: 150,
    }),
  });
  const data = await response.json();
  return data.choices[0].text.trim();
}

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

    // Summarize chat history if it gets too long
    const MAX_TOKENS = 2000;
    let messagesToInclude = [];
    let usedTokens = 0;
    let allMessages = [];

    chatMessages.reverse();
    for (let chatMessage of chatMessages) {
      allMessages.push(chatMessage);
      const messageTokens = chatMessage.content.length / 4;
      usedTokens = usedTokens + messageTokens;
      if (usedTokens > MAX_TOKENS) {
        const summary = await summarizeChatHistory(allMessages);
        messagesToInclude = [
          {
            role: 'system',
            content: `Summary of previous messages: ${summary}`,
          },
        ];
        usedTokens = summary.length / 4;
        allMessages = [];
      }
      messagesToInclude.push(chatMessage);
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
