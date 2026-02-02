import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExportUrl } from '../hooks/useApi';

interface SummaryProps {
  conversationId: number;
  summary: string;
}

export default function Summary({ conversationId, summary }: SummaryProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 md:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Conversation Complete
        </h2>
        <p className="text-gray-600">
          You've completed all 10 questions. Here's a summary of your journey:
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-6 mb-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Summary</h3>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 rounded-md transition"
            title="Copy summary to clipboard"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M5 13l4 4L19 7"></path>
                </svg>
                <span>Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{summary}</div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => navigate('/')}
          className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition font-medium"
        >
          Return to Dashboard
        </button>
        <a
          href={getExportUrl(conversationId)}
          download
          className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium text-center"
        >
          Export Full Conversation
        </a>
      </div>
    </div>
  );
}
