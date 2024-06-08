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
import LoginMessage from '@/components/LoginMessage';

export default function Home({ chatId, title, messages = [] }) {
  console.log('props recorded', title, messages);
  const [showLoginMessage, setshowLoginMessage] = useState(true);
  const [newChatId, setNewChatId] = useState(null);
  const [incomingMessage, setIncomingMessage] = useState('');
  const [messageText, setMessageText] = useState('');
  const [newChatMessages, setNewChatMessages] = useState([]);
  const [generatingResponse, setGeneratingResponse] = useState(false);
  const { user } = useUser();
  const [fullMessage, setFullMessage] = useState('');
  const router = useRouter();

  const handleAcknowledge = () => {
    setshowLoginMessage(false);
  };

  useEffect(() => {
    if (!generatingResponse && fullMessage) {
      setNewChatMessages(prev => [
        ...prev,
        {
          _id: uuid(),
          role: 'assistant',
          content: fullMessage,
        },
      ]);
      setFullMessage('');
    }
  }, [generatingResponse, fullMessage]);

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
    setGeneratingResponse(true);
    const currentMessageText = messageText;
    setNewChatMessages(prev => [
      ...prev,
      {
        _id: uuid(),
        role: 'user',
        content: currentMessageText,
      },
    ]);
    setMessageText('');

    const response = await fetch('/api/chat/sendMessage', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ chatId, message: currentMessageText }),
    });
    const data = response.body;

    if (!data) {
      return;
    }

    const reader = data.getReader();
    let content = '';
    await streamReader(reader, async message => {
      console.log('Message: ', message);
      if (message.event === 'newChatId') {
        setNewChatId(message.content);
      } else {
        setIncomingMessage(s => `${s}${message.content}`);
        content += message.content;
      }
    });
    setFullMessage(content);
    setIncomingMessage('');
    setGeneratingResponse(false);
  };

  const allMessages = [...messages, ...newChatMessages];
  return (
    <>
      {showLoginMessage && <LoginMessage onAcknowledge={handleAcknowledge} />}{' '}
      {/* Conditional rendering of LoginDialog */}
      <div
        className={`grid h-screen grid-cols-[260px_1fr] ${
          showLoginMessage ? 'hidden' : ''
        }`}
      >
        <Head>
          <title>New Chat</title>
        </Head>
        <ChatSidebar chatId={chatId} />
        <div className="flex flex-col overflow-hidden bg-gray-700">
          <div
            className="flex flex-1 flex-col-reverse text-white overflow-scroll"
            role="main"
            aria-label="Chat messages"
          >
            <div className="mb-auto">
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
          </div>
          <footer
            className="bg-gray-800 p-8"
            role="contentinfo"
            aria-label="Message input area"
          >
            <form onSubmit={handleSubmit} aria-label="Send message form">
              <fieldset className="flex gap-2" disabled={generatingResponse}>
                <textarea
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder={generatingResponse ? '' : 'Send a message...'}
                  className="w-full resize-none rounded-md bg-gray-700 px-5 py-1 text-white"
                  aria-label="Message text area"
                ></textarea>
                <button className="btn" type="submit" aria-label="Send message">
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
          messageTime: message.messageTime
            ? message.messageTime.toISOString()
            : null,
        })),
      },
    };
  }

  return {
    props: {},
  };
};
