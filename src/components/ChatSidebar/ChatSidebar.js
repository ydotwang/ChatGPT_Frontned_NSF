import { faMessage, faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export const ChatSidebar = ({ chatId }) => {
  const [chatList, setChatList] = useState([]);

  useEffect(() => {
    const loadChatList = async () => {
      try {
        const response = await fetch(`/api/chat/getChatList`, {
          method: 'POST',
        });
        const json = await response.json();
        console.log('Chat list: ', json);
        setChatList(json?.chats || []);
        console.log('chatID = ', chatId);
      } catch (error) {
        console.error('Failed to load chat list:', error);
      }
    };
    loadChatList();
  }, [chatId]);

  return (
    <div
      className="flex flex-col overflow-hidden text-white bg-slate-900 p-4"
      role="navigation"
      aria-label="Chat sidebar"
    >
      <Link
        aria-label="New Chat"
        href="/chat"
        className="side-menu-item bg-emerald-500 hover:bg-emerald-600"
      >
        <FontAwesomeIcon icon={faPlus} aria-hidden="true" /> New chat
      </Link>
      <div
        className="flex-1 overflow-auto bg-gray-850"
        role="region"
        aria-label="Chat list"
      >
        {chatList.map(chat => (
          <Link
            aria-label={
              chatId === chat._id
                ? `Current chat: ${chat.title}`
                : `Chat: ${chat.title}`
            }
            className={`side-menu-item ${
              chatId === chat._id ? 'bg-gray-700' : ''
            }`}
            key={chat._id}
            href={`/chat/${chat._id}`}
          >
            <FontAwesomeIcon icon={faMessage} aria-hidden="true" /> {chat.title}
          </Link>
        ))}
      </div>
      <Link
        className="side-menu-item bg-red-500 hover:bg-red-600"
        href="/api/auth/logout"
        aria-label="Logout"
      >
        Logout
      </Link>
    </div>
  );
};
