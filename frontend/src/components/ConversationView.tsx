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
      <div className="page">
        <div className="center muted">Loading conversation...</div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="page">
        <div className="center">
          <div>
            <p className="muted" style={{ marginBottom: 12 }}>Conversation not found</p>
            <button
              onClick={() => navigate('/')}
              className="btn btn-soft"
            >
              Return to Dashboard
            </button>
          </div>
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
    <div className="page">
      <div className="container" style={{ maxWidth: 840 }}>
        {/* Top scroll anchor */}
        <div ref={topRef} />

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <button
            onClick={() => navigate('/')}
            className="btn btn-ghost"
          >
            ← Back to Dashboard
          </button>
          <h1 className="section-title">{conversation.title}</h1>
          <p className="section-subtitle">
            {isComplete
              ? 'Completed'
              : `Question ${conversation.currentQuestionNumber} of 10`}
          </p>
        </div>

        {error && (
          <div className="error" style={{ marginBottom: 16 }}>
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
            <details className="card" style={{ marginTop: 20 }}>
              <summary className="details-summary">
                <span>View full conversation</span>
                <svg
                  width="20"
                  height="20"
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
              <div className="stack" style={{ padding: '0 18px 18px' }}>
                {questionPairs.map((pair) => (
                  <div key={pair.question.id}>
                    <QuestionCard
                      question={pair.question}
                      isLatest={false}
                    />
                    {pair.response && (
                      <div className="response-box">
                        <p className="muted" style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                          Your Response:
                        </p>
                        <p style={{ whiteSpace: 'pre-wrap' }}>{pair.response.content}</p>
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
            <div className="stack" style={{ marginBottom: 24 }}>
              {questionPairs.map((pair) => (
                <div key={pair.question.id}>
                  <QuestionCard
                    question={pair.question}
                    isLatest={pair.question.id === currentQuestion?.id}
                  />
                  {pair.response && (
                    <div className="response-box">
                      <p className="muted" style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                        Your Response:
                      </p>
                      <p style={{ whiteSpace: 'pre-wrap' }}>{pair.response.content}</p>
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
        <div className="floating-stack">
          {/* Scroll to top button */}
          <button
            onClick={scrollToTop}
            className="fab"
            aria-label="Scroll to top"
            title="Scroll to top"
          >
            <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </button>

          {/* Scroll to bottom button - only show for in-progress conversations */}
          {!isComplete && currentQuestion && (
            <button
              onClick={scrollToBottom}
              className="fab fab-primary"
              aria-label="Scroll to current question"
              title="Jump to current question"
            >
              <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
