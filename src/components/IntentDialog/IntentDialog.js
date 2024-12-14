import { useState } from 'react';

const IntentDialog = ({ onSubmit, onClear }) => {
  const [intent, setIntent] = useState('');

  const handleChange = e => {
    setIntent(e.target.value);
  };

  const handleClear = () => {
    setIntent('');
    onClear();
  };

  const handleSubmit = () => {
    if (intent.length >= 15) {
      onSubmit(intent);
    } else {
      alert('Intent must be at least 15 characters long.');
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[9999]"
      role="dialog"
      aria-labelledby="intent-dialog-title"
      aria-describedby="intent-dialog-description"
      aria-modal="true"
    >
      <div className="bg-gray-700 p-6 rounded shadow-md text-white">
        <h2 id="intent-dialog-title" className="text-xl font-bold mb-4">
          Enter Your Intentions
        </h2>
        <p id="intent-dialog-description" className="mb-4">
          Please enter your intentions for using ChatGPT (at least 15
          characters).
        </p>
        <textarea
          value={intent}
          onChange={handleChange}
          placeholder="Type your intentions here..."
          className="w-full h-24 p-2 mb-4 bg-gray-600 rounded"
          aria-label="Intentions text area"
        ></textarea>
        <div className="flex justify-end space-x-4">
          <button
            onClick={handleClear}
            className="btn"
            aria-label="Clear text field"
          >
            Clear
          </button>
          <button
            onClick={handleSubmit}
            className="btn bg-blue-500 hover:bg-blue-600"
            aria-label="Submit intentions"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default IntentDialog;
