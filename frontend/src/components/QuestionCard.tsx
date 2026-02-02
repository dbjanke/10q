import { Message } from '../types';

interface QuestionCardProps {
  question: Message;
  isLatest?: boolean;
}

export default function QuestionCard({ question, isLatest }: QuestionCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${isLatest ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-blue-600">
          Question {question.questionNumber} of 10
        </span>
        {isLatest && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
            Current
          </span>
        )}
      </div>
      <p className="text-lg text-gray-900">{question.content}</p>
    </div>
  );
}
