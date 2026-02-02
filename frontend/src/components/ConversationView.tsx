import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ConversationWithMessages, Message } from '../types';
import * as api from '../hooks/useApi';
import QuestionCard from './QuestionCard';
import ResponseInput from './ResponseInput';
import Summary from './Summary';

export default function ConversationView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<ConversationWithMessages | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadConversation(parseInt(id));
    }
  }, [id]);

  async function loadConversation(conversationId: number) {
    try {
      setLoading(true);
      const data = await api.getConversation(conversationId);
      setConversation(data);
      setError(null);
    } catch (err) {
      setError('Failed to load conversation');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleResponseSubmit(response: string) {
    if (!conversation) return;

    try {
      setSubmitting(true);
      setError(null);

      await api.submitResponse(conversation.id, response);

      // Reload the conversation to get updated state
      await loadConversation(conversation.id);
    } catch (err) {
      setError('Failed to submit response');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading conversation...</div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Conversation not found</p>
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Group messages by question number
  const questionPairs: Array<{ question: Message; response?: Message }> = [];
  const questions = conversation.messages.filter((m) => m.type === 'question');
  const responses = conversation.messages.filter((m) => m.type === 'response');
  const summaryMessage = conversation.messages.find((m) => m.type === 'summary');

  for (const question of questions) {
    const response = responses.find((r) => r.questionNumber === question.questionNumber);
    questionPairs.push({ question, response });
  }

  const currentQuestion = questionPairs.find((pair) => !pair.response)?.question;
  const isComplete = conversation.completed;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{conversation.title}</h1>
          <p className="text-gray-600 mt-2">
            {isComplete
              ? 'Completed'
              : `Question ${conversation.currentQuestionNumber} of 10`}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Question and Response History */}
        <div className="space-y-6 mb-8">
          {questionPairs.map((pair) => (
            <div key={pair.question.id}>
              <QuestionCard
                question={pair.question}
                isLatest={pair.question.id === currentQuestion?.id}
              />
              {pair.response && (
                <div className="mt-4 bg-gray-50 rounded-lg p-6">
                  <p className="text-sm font-medium text-gray-700 mb-2">Your Response:</p>
                  <p className="text-gray-900 whitespace-pre-wrap">{pair.response.content}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Input or Summary */}
        {isComplete && summaryMessage ? (
          <Summary conversationId={conversation.id} summary={summaryMessage.content} />
        ) : currentQuestion ? (
          <ResponseInput onSubmit={handleResponseSubmit} disabled={submitting} />
        ) : null}
      </div>
    </div>
  );
}
