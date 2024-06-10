import React, { useState } from 'react';

const AnnotationDialog = ({ onSubmit, onClose }) => {
  const [annotation, setAnnotation] = useState('');

  const handleSubmit = () => {
    if (annotation.trim().length >= 15) {
      onSubmit(annotation);
    } else {
      alert('Annotation must be at least 15 characters long.');
    }
  };

  return (
    <div
      role="dialog"
      aria-labelledby="annotation-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
    >
      <div className="bg-gray-800 p-8 rounded-md shadow-lg w-full max-w-md">
        <h2
          id="annotation-dialog-title"
          className="text-xl font-bold mb-4 text-white"
        >
          Add Annotation
        </h2>
        <textarea
          value={annotation}
          onChange={e => setAnnotation(e.target.value)}
          className="w-full h-24 p-2 border border-gray-600 rounded-md bg-gray-700 text-white"
          aria-label="Annotation text area"
        />
        <div className="flex justify-end mt-4">
          <button
            onClick={handleSubmit}
            className="btn mr-2 bg-emerald-500 text-white hover:bg-emerald-700"
            aria-label="Submit annotation"
          >
            Submit
          </button>
          <button
            onClick={onClose}
            className="btn bg-blue-500 hover:bg-blue-600"
            aria-label="Close annotation dialog"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnotationDialog;
