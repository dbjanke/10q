import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getExportUrl } from '../hooks/useApi';

interface SummaryProps {
  conversationId: number;
  summary: string;
  canRegenerate?: boolean;
  regenerating?: boolean;
  onRegenerate?: () => void;
}

export default function Summary({ conversationId, summary, canRegenerate, regenerating, onRegenerate }: SummaryProps) {
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
    <div className="card" style={{ padding: 26 }}>
      <div style={{ marginBottom: 18 }}>
        <h2 className="section-title" style={{ fontSize: 26, marginBottom: 6 }}>
          Conversation Complete
        </h2>
        <p className="muted">
          You've completed all 10 questions. Here's a summary of your journey:
        </p>
      </div>

      <div className="summary-box" style={{ marginBottom: 18 }}>
        <div className="row" style={{ alignItems: 'flex-start', marginBottom: 12, justifyContent: 'space-between', gap: 12 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600 }}>Summary</h3>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {canRegenerate && (
              <button
                onClick={onRegenerate}
                className="btn btn-ghost"
                disabled={regenerating}
                title="Regenerate summary"
              >
                {regenerating ? 'Regenerating...' : 'Regenerate'}
              </button>
            )}
            <button
              onClick={handleCopy}
              className="btn btn-soft"
              title="Copy summary to clipboard"
            >
              {copied ? (
                <>
                  <svg width="16" height="16" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <svg width="16" height="16" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                  </svg>
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{summary}</div>
      </div>

      <div className="row" style={{ flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/')}
          className="btn btn-soft"
        >
          Return to Dashboard
        </button>
        <a
          href={getExportUrl(conversationId)}
          download
          className="btn btn-primary"
        >
          Export Full Conversation
        </a>
      </div>
    </div>
  );
}
