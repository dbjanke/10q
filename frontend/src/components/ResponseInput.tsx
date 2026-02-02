import { useState } from 'react';

interface ResponseInputProps {
  onSubmit: (response: string) => void;
  disabled?: boolean;
}

export default function ResponseInput({ onSubmit, disabled }: ResponseInputProps) {
  const [response, setResponse] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (response.trim() && !disabled) {
      onSubmit(response.trim());
      setResponse('');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Your Response
      </label>
      <textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder="Take your time to reflect and respond..."
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        rows={6}
        disabled={disabled}
      />
      <div className="flex justify-between items-center mt-4">
        <span className="text-sm text-gray-500">
          {response.length} characters
        </span>
        <button
          type="submit"
          disabled={!response.trim() || disabled}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {disabled ? 'Submitting...' : 'Submit Response'}
        </button>
      </div>
    </form>
  );
}
