import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
export const Message = ({ role, content, user }) => {
  return (
    <div
      className={`grid grid-cols-[30px_1fr] gap-5 p-5${
        role === 'assistant' ? ' bg-gray-600' : ''
      }`}
    >
      <div>
        {role === 'user' && !!user && (
          <Image
            src={user.picture}
            width={30}
            height={30}
            alt="User profile picture"
            className="rounded-sm shadow-md shadow-black/50"
          />
        )}
        {role === 'assistant' && (
          <div>
            <Image
              src="/openai.svg"
              width={30}
              height={30}
              alt="ChatGPT Icon"
            />
          </div>
        )}
      </div>
      <div className="prose prose-invert">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
};
