import Head from 'next/head';
import { ChatSidebar } from '@/components/ChatSidebar';
import { useEffect, useState, useCallback } from 'react';
import { streamReader } from 'openai-edge-stream';
import { v4 as uuid } from 'uuid';
import { Message } from '@/components/Message';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/router';
import { getSession } from '@auth0/nextjs-auth0';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import LoginMessage from '@/components/LoginMessage';
import IntentDialog from '@/components/IntentDialog';
import AnnotationDialog from '@/components/AnnotationDialog';
import EndChatDialog from '@/components/EndChatDialog';

export default function Home({ chatId, messages = [], feedback }) {
  const [showLoginMessage, setshowLoginMessage] = useState(true);
  const [newChatId, setNewChatId] = useState(null);
  const [incomingMessage, setIncomingMessage] = useState('');
  const [messageText, setMessageText] = useState('');
  const [newChatMessages, setNewChatMessages] = useState([]);
  const [generatingResponse, setGeneratingResponse] = useState(false);
  const [showIntentDialog, setShowIntentDialog] = useState(false);
  const [showAnnotationDialog, setShowAnnotationDialog] = useState(false);
  const [showEndChatDialog, setShowEndChatDialog] = useState(false);
  const { user } = useUser();
  const [fullMessage, setFullMessage] = useState('');
  const [chatFeedback, setChatFeedback] = useState(feedback ? feedback : '');
  const isMac =
    typeof window !== 'undefined' &&
    /Mac|iPod|iPhone|iPad/.test(window.navigator.platform);

  const router = useRouter();

  const handleIntentSubmit = async intent => {
    const response = await fetch('/api/chat/saveIntent', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ chatId, intent }),
    });
    const data = await response.json();

    if (data.message === 'Intent saved successfully') {
      setShowIntentDialog(false);
    } else {
      alert('An error occurred while saving your intent. Please try again.');
    }
  };

  const handleIntentClear = () => {
    setShowIntentDialog(true);
  };

  const handleAcknowledge = () => {
    setshowLoginMessage(false);
  };

  const handleAnnotationSubmit = async annotation => {
    const response = await fetch('/api/chat/saveAnnotation', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ chatId, annotation }),
    });
    const data = await response.json();

    if (data.message === 'Annotation saved successfully') {
      setShowAnnotationDialog(false);
    } else {
      alert(
        'An error occurred while saving your annotation. Please try again.',
      );
    }
  };

  const handleEndChat = () => {
    setShowEndChatDialog(true);
  };

  const handleEndChatSubmit = async feedback => {
    const response = await fetch('/api/chat/saveFeedback', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ chatId, feedback }),
    });
    const data = await response.json();

    if (data.message === 'Feedback saved successfully') {
      setShowEndChatDialog(false);
      setChatFeedback(feedback);
    } else {
      alert('An error occurred while saving your feedback. Please try again.');
    }
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

  useEffect(() => {
    setNewChatMessages([]);
    setNewChatId(null);
    setChatFeedback(feedback ? feedback : '');
  }, [chatId, feedback]);

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
        setShowIntentDialog(true);
      } else {
        setIncomingMessage(s => `${s}${message.content}`);
        content += message.content;
      }
    });
    setFullMessage(content);
    setIncomingMessage('');
    setGeneratingResponse(false);
  };

  const handleKeyDown = useCallback(
    e => {
      if (e.key === 'Enter' && (isMac ? !e.metaKey : !e.ctrlKey)) {
        e.preventDefault();
        handleSubmit(e);
      } else if (e.key === 'Enter' && (isMac ? e.metaKey : e.ctrlKey)) {
        setMessageText(prev => prev + '\n');
      } else if (e.key === 'A' && (isMac ? e.shiftKey : e.shiftKey)) {
        e.preventDefault();
        if (chatId) {
          setShowAnnotationDialog(true);
        }
      }
    },
    [chatId, handleSubmit, isMac],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const allMessages = [...messages, ...newChatMessages];
  return (
    <>
      {showIntentDialog && (
        <IntentDialog
          onSubmit={handleIntentSubmit}
          onClear={handleIntentClear}
        />
      )}
      {showAnnotationDialog && (
        <AnnotationDialog
          onSubmit={handleAnnotationSubmit}
          onClose={() => setShowAnnotationDialog(false)}
        />
      )}
      {showEndChatDialog && (
        <EndChatDialog
          chatId={chatId}
          messages={allMessages}
          onSubmit={handleEndChatSubmit}
          onClose={() => setShowEndChatDialog(false)}
        />
      )}
      {showLoginMessage && <LoginMessage onAcknowledge={handleAcknowledge} />}{' '}
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
              {allMessages
                .filter(
                  message =>
                    message.role === 'user' || message.role === 'assistant',
                )
                .map(message => (
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
              <fieldset
                className="flex gap-2"
                disabled={
                  generatingResponse || showIntentDialog || chatFeedback !== ''
                }
              >
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
                <button
                  type="button"
                  onClick={handleEndChat}
                  className="btn bg-red-600 text-white hover:bg-red-800"
                  aria-label="End chat"
                >
                  End Chat
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
        messages: chat.messages.map(message => ({
          ...message,
          _id: uuid(),
          messageTime: message.messageTime
            ? message.messageTime.toISOString()
            : null,
        })),
        feedback: chat.feedback || '',
      },
    };
  }

  return {
    props: {},
  };
};
