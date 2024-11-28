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

export default function Home({ chatId, messages = [], feedback, isEnded }) {
  const [showLoginMessage, setshowLoginMessage] = useState(true);
  const [newChatId, setNewChatId] = useState(null);
  const [incomingMessage, setIncomingMessage] = useState('');
  const [messageText, setMessageText] = useState('');
  const [newChatMessages, setNewChatMessages] = useState([]);
  const [generatingResponse, setGeneratingResponse] = useState(false);
  const [showIntentDialog, setShowIntentDialog] = useState(false);
  const [showAnnotationDialog, setShowAnnotationDialog] = useState(false);
  const [showEndChatDialog, setShowEndChatDialog] = useState(false);
  const [isChatEnded, setIsChatEnded] = useState(isEnded);
  const { user } = useUser();
  const [fullMessage, setFullMessage] = useState('');
  const [chatFeedback, setChatFeedback] = useState(feedback || '');
  const [isMac, setIsMac] = useState(false);
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
    try {
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
        setIsChatEnded(true);
      } else {
        alert(
          'An error occurred while saving your feedback. Please try again.',
        );
      }
    } catch (error) {
      alert('An error occurred while saving your feedback. Please try again.');
    }
  };

  const handleAcknowledge = () => {
    setshowLoginMessage(false);
  };

  useEffect(() => {
    setIsChatEnded(isEnded);
  }, [chatId, isEnded]);

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
  }, [newChatId, generatingResponse, router]);

  useEffect(() => {
    setNewChatMessages([]);
    setNewChatId(null);
    setChatFeedback(feedback || '');
  }, [chatId, feedback]);

  const handleSubmit = async e => {
    e.preventDefault();
    if (messageText.trim() === '') return;

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

  useEffect(() => {
    setIsMac(
      /Mac|iPod|iPhone|iPad/.test(window.navigator.platform) ||
        /Mac/.test(window.navigator.userAgent),
    );
  }, []);

  const handleKeyDown = useCallback(
    e => {
      const isMacPlatform =
        typeof window !== 'undefined' &&
        (/Mac|iPod|iPhone|iPad/.test(window.navigator.platform) ||
          /Mac/.test(window.navigator.userAgent));

      if (e.key === 'Enter') {
        if (showIntentDialog || showAnnotationDialog || showEndChatDialog) {
          e.preventDefault();
          const focusedElement = document.activeElement;
          if (focusedElement && focusedElement.tagName === 'BUTTON') {
            focusedElement.click();
          }
        } else if (
          messageText.trim() !== '' &&
          (isMacPlatform ? !e.metaKey : !e.ctrlKey)
        ) {
          e.preventDefault();
          handleSubmit(e);
        } else if (isMacPlatform ? e.metaKey : e.ctrlKey) {
          setMessageText(prev => prev + '\n');
        }
      } else if (e.key === '0' || e.keyCode === 48) {
        if (isMacPlatform && e.metaKey && e.altKey) {
          e.preventDefault();
          if (chatId) {
            setShowAnnotationDialog(true);
          }
        } else if (!isMacPlatform && e.ctrlKey && e.altKey) {
          e.preventDefault();
          if (chatId) {
            setShowAnnotationDialog(true);
          }
        }
      }
    },
    [
      chatId,
      handleSubmit,
      showIntentDialog,
      showAnnotationDialog,
      showEndChatDialog,
      messageText,
    ],
  );

  // Added the missing useEffect hook for keyboard event listener
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
          onClear={() => setShowIntentDialog(false)}
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
      {showLoginMessage && <LoginMessage onAcknowledge={handleAcknowledge} />}

      <div className={`fixed inset-0 ${showLoginMessage ? 'hidden' : ''}`}>
        <Head>
          <title>New Chat</title>
        </Head>

        <div className="h-screen grid grid-cols-[260px_1fr]">
          <div className="h-screen overflow-hidden">
            <ChatSidebar
              chatId={chatId}
              generatingResponse={generatingResponse}
            />
          </div>

          <div className="flex flex-col h-screen bg-gray-700">
            <div
              className="flex-1 overflow-y-auto"
              role="main"
              aria-label="Chat messages"
            >
              <div className="flex flex-col justify-end min-h-full">
                <div>
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
            </div>

            <footer
              className="flex-shrink-0 bg-gray-800 p-8"
              role="contentinfo"
              aria-label="Message input area"
            >
              <form onSubmit={handleSubmit} aria-label="Send message form">
                <fieldset
                  className="flex gap-2"
                  disabled={
                    generatingResponse ||
                    showIntentDialog ||
                    showEndChatDialog ||
                    isChatEnded
                  }
                >
                  <textarea
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    placeholder={
                      isChatEnded
                        ? 'Chat ended'
                        : generatingResponse
                        ? ''
                        : 'Send a message...'
                    }
                    className="w-full resize-none rounded-md bg-gray-700 px-5 py-1 text-white"
                    aria-label="Message text area"
                  ></textarea>
                  <button
                    className="btn"
                    type="submit"
                    aria-label="Send message"
                  >
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
      </div>
    </>
  );
}

// Previous imports remain the same...

export const getServerSideProps = async context => {
  const chatId = context.params?.chatID?.[0] || null;

  if (chatId) {
    let objectId;

    try {
      objectId = new ObjectId(chatId);
    } catch (err) {
      console.error('Error parsing chat id:', err);
      return {
        redirect: {
          destination: '/chat',
          permanent: false,
        },
      };
    }

    const { user } = await getSession(context.req, context.res);
    const client = await clientPromise;
    const db = client.db('NsfDatabase');
    const chat = await db
      .collection('chats')
      .findOne({ userId: user.sub, _id: objectId });

    if (!chat) {
      return {
        redirect: {
          destination: '/chat',
          permanent: false,
        },
      };
    }

    // Serialize the feedback object if it exists
    const serializedFeedback = chat.feedback
      ? {
          ...chat.feedback,
          submittedAt: chat.feedback.submittedAt
            ? chat.feedback.submittedAt.toISOString()
            : null,
        }
      : '';

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
        feedback: serializedFeedback,
        isEnded: Boolean(chat.feedback),
      },
    };
  }

  return {
    props: {},
  };
};
