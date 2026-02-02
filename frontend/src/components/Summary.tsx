import { useNavigate } from 'react-router-dom';
import { getExportUrl } from '../hooks/useApi';

interface SummaryProps {
  conversationId: number;
  summary: string;
}

export default function Summary({ conversationId, summary }: SummaryProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-lg shadow p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Conversation Complete
        </h2>
        <p className="text-gray-600">
          You've completed all 10 questions. Here's a summary of your journey:
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Summary</h3>
        <div className="text-gray-700 whitespace-pre-wrap">{summary}</div>
      </div>

      <div className="flex gap-3">
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
          Export as Markdown
        </a>
      </div>
    </div>
  );
}
