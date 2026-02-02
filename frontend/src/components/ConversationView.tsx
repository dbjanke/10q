import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ConversationWithMessages, Message } from '../types';
import * as api from '../hooks/useApi';
import QuestionCard from './QuestionCard';
import ResponseInput from './ResponseInput';
import Summary from './Summary';
import LoadingIndicator from './LoadingIndicator';

export default function ConversationView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<ConversationWithMessages | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      loadConversation(parseInt(id));
    }
  }, [id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

      const result = await api.submitResponse(conversation.id, response);

      // If conversation is now complete, reload to get the summary
      if (result.isComplete) {
        await loadConversation(conversation.id);
        return;
      }

      // Optimistically update the conversation state for non-complete responses
      setConversation((prev) => {
        if (!prev) return prev;

        const updatedMessages = [...prev.messages, result.savedResponse];

        if (result.nextQuestion) {
          updatedMessages.push(result.nextQuestion);
        }

        return {
          ...prev,
          messages: updatedMessages,
          currentQuestionNumber: result.nextQuestion?.questionNumber || prev.currentQuestionNumber,
          completed: result.isComplete,
        };
      });

      // Scroll to the new content after state update
      setTimeout(scrollToBottom, 100);
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
        {/* Top scroll anchor */}
        <div ref={topRef} />

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

        {/* Show Summary first when complete */}
        {isComplete && summaryMessage ? (
          <>
            <Summary
              conversationId={conversation.id}
              summary={summaryMessage.content}
            />

            {/* Collapsed conversation history */}
            <details className="mt-6 bg-white rounded-lg shadow">
              <summary className="cursor-pointer px-6 py-4 font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition select-none flex items-center justify-between">
                <span>View full conversation</span>
                <svg
                  className="w-5 h-5 transition-transform duration-200 details-open:rotate-180"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M19 9l-7 7-7-7"></path>
                </svg>
              </summary>
              <div className="px-6 pb-6 pt-2 space-y-6">
                {questionPairs.map((pair) => (
                  <div key={pair.question.id}>
                    <QuestionCard
                      question={pair.question}
                      isLatest={false}
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
            </details>
          </>
        ) : (
          <>
            {/* In-progress conversation */}
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

            {/* Input or Loading Indicator */}
            {submitting ? (
              <LoadingIndicator />
            ) : (
              currentQuestion && (
                <ResponseInput onSubmit={handleResponseSubmit} disabled={submitting} />
              )
            )}
          </>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating scroll buttons */}
      {conversation && (
        <div className="fixed bottom-8 right-8 flex flex-col gap-3">
          {/* Scroll to top button */}
          <button
            onClick={scrollToTop}
            className="bg-white hover:bg-gray-50 text-gray-700 p-3 rounded-full shadow-lg border border-gray-200 transition-all hover:scale-110"
            aria-label="Scroll to top"
            title="Scroll to top"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>

          {/* Scroll to bottom button - only show for in-progress conversations */}
          {!isComplete && currentQuestion && (
            <button
              onClick={scrollToBottom}
              className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all hover:scale-110"
              aria-label="Scroll to current question"
              title="Jump to current question"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
