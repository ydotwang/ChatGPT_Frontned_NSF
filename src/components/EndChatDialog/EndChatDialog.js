import React, { useEffect, useState } from 'react';

const EndChatDialog = ({ chatId, messages, onSubmit, onClose }) => {
  const [summary, setSummary] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateSummary = async () => {
      try {
        const response = await fetch('/api/chat/generateSummary', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({ messages }),
        });
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setSummary(data.summary);
      } catch (error) {
        console.error('Failed to generate summary:', error);
        setSummary('Failed to generate summary.');
      } finally {
        setLoading(false);
      }
    };

    generateSummary();
  }, [messages]);

  const handleSubmit = () => {
    onSubmit(feedback);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="end-chat-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    >
      <div className="bg-gray-800 p-8 rounded-md shadow-lg w-full max-w-md text-white">
        <h2 id="end-chat-dialog-title" className="text-xl font-bold mb-4">
          End Chat
        </h2>
        {loading ? (
          <p>Loading summary...</p>
        ) : (
          <>
            <p className="mb-4">{summary}</p>
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Provide your feedback..."
              className="w-full h-24 p-2 border border-gray-600 rounded-md bg-gray-700 text-white"
              aria-label="Feedback text area"
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={handleSubmit}
                className="btn mr-2 bg-emerald-500 text-white hover:bg-emerald-700"
                aria-label="Submit feedback"
              >
                Submit
              </button>
              <button
                onClick={onClose}
                className="btn bg-blue-500 text-white hover:bg-blue-700"
                aria-label="Close dialog"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EndChatDialog;
