import { useRouter } from 'next/router';

const LoginMessage = ({ onAcknowledge }) => {
  const router = useRouter();

  const handleReject = () => {
    router.push('/api/auth/logout');
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
      role="dialog"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-description"
      aria-modal="true"
    >
      <div className="bg-gray-700 p-6 rounded shadow-md text-white">
        <h2 id="dialog-title" className="text-xl font-bold mb-4">
          Welcome!
        </h2>
        <p id="dialog-description" className="mb-4">
          Please acknowledge this message to continue.
        </p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onAcknowledge}
            className="btn"
            aria-label="Acknowledge the message"
          >
            Acknowledge
          </button>
          <button
            onClick={handleReject}
            className="btn bg-red-500 hover:bg-red-600"
            aria-label="Reject and log out"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginMessage;
