import Head from 'next/head';
import { ChatSidebar } from '@/components/ChatSidebar';
import { useEffect, useState } from 'react';
import { streamReader } from 'openai-edge-stream';
import { v4 as uuid } from 'uuid';
import { Message } from '@/components/Message';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/router';
import { getSession } from '@auth0/nextjs-auth0';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export default function Home({ chatId, title, messages = [] }) {
  console.log('props recorded', title, messages);
  const [newChatId, setNewChatId] = useState(null);
  const [incomingMessage, setIncomingMessage] = useState('');
  const [messageText, setMessageText] = useState('');
  const [newChatMessages, setNewChatMessages] = useState([]);
  const [generatingResponse, setGeneratingReponse] = useState(false);
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    setNewChatMessages([]);
    setNewChatId(null);
  }, [chatId]);

  useEffect(() => {
    if (!generatingResponse && newChatId) {
      setNewChatId(null);
      router.push(`/chat/${newChatId}`);
    }
  }, [newChatId, generatingResponse]);
  const handleSubmit = async e => {
    e.preventDefault();
    setGeneratingReponse(true);
    const currentMessageText = messageText;
    setNewChatMessages(prev => {
      const newChatMessages = [
        ...prev,
        {
          _id: uuid(),
          role: 'user',
          content: currentMessageText,
        },
      ];
      return newChatMessages;
    });
    setMessageText('');

    const response = await fetch('/api/chat/sendMessage', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ message: currentMessageText }),
    });
    const data = response.body;

    if (!data) {
      return;
    }

    const reader = data.getReader();
    await streamReader(reader, async message => {
      console.log('Message: ', message);
      if (message.event === 'newChatId') {
        setNewChatId(message.content);
      } else {
        setIncomingMessage(s => `${s}${message.content}`);
      }
    });
    setIncomingMessage('');
    setGeneratingReponse(false);
  };

  const allMessages = [...messages, ...newChatMessages];
  return (
    <>
      <Head>
        <title>New Chat</title>
      </Head>
      <div className="grid h-screen grid-cols-[260px_1fr]">
        <ChatSidebar chatId={chatId} />
        <div className="flex flex-col bg-gray-700 overflow-hidden">
          <div className="flex-1 text-white overflow-scroll">
            {allMessages.map(message => (
              <Message
                key={message._id}
                role={message.role}
                content={message.content}
                user={user}
              />
            ))}
            {!!incomingMessage && (
              <Message role="assistant" content={incomingMessage} />
            )}
          </div>
          <footer className="bg-gray-800 p-8">
            <form onSubmit={handleSubmit}>
              <fieldset className="flex gap-2" disabled={generatingResponse}>
                <textarea
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder={generatingResponse ? '' : 'Send a message...'}
                  className="w-full resize-none rounded-md bg-gray-700 px-5 py-1 text-white"
                ></textarea>
                <button className="btn" type="submit">
                  Send
                </button>
              </fieldset>
            </form>
          </footer>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps = async context => {
  console.log('prop chat id in chat param page = ', context.params);
  const chatId = context.params?.chatID?.[0] || null;
  console.log('prop chat id in chatID page = ', chatId);

  if (chatId) {
    const { user } = await getSession(context.req, context.res);
    const client = await clientPromise;
    const db = client.db('NsfDatabase');
    const chat = await db
      .collection('chats')
      .findOne({ userId: user.sub, _id: new ObjectId(chatId) });

    return {
      props: {
        chatId,
        title: chat.title,
        messages: chat.messages.map(message => ({
          ...message,
          _id: uuid(),
        })),
      },
    };
  }

  return {
    props: {},
  };
};
