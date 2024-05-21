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
    <div className="flex flex-col overflow-hidden text-white bg-slate-900 p-4">
      <Link
        alt="New Chat link"
        href="/chat"
        className="side-menu-item bg-emerald-500 hover:bg-emerald-600"
      >
        <FontAwesomeIcon icon={faPlus} aria-hidden="true"></FontAwesomeIcon>
        New chat
      </Link>
      <div className="flex-1 overflow-auto bg-gray-950">
        {chatList.map(chat => (
          <Link
            alt={
              chatId === chat._id
                ? `current chat link: ${chat.title}`
                : `old chat link: ${chat.title}`
            }
            className={`side-menu-item ${
              chatId === chat._id ? 'bg-gray-700' : ''
            }`}
            key={chat._id}
            href={`/chat/${chat._id}`}
          >
            <FontAwesomeIcon
              icon={faMessage}
              aria-hidden="true"
            ></FontAwesomeIcon>
            {chat.title}
          </Link>
        ))}
      </div>
      <Link href="/api/auth/logout">Logout</Link>
    </div>
  );
};
