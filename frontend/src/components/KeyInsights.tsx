import { Message } from '../types';

interface KeyInsightsProps {
    insight?: Message;
    canRegenerate?: boolean;
    regenerating?: boolean;
    disabled?: boolean;
    onRegenerate?: () => void;
}

export default function KeyInsights({ insight, canRegenerate, regenerating, disabled, onRegenerate }: KeyInsightsProps) {
    return (
        <details className="card">
            <summary className="details-summary">
                <span>Key Insights</span>
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
            <div className="stack" style={{ padding: '0 18px 18px', gap: 12 }}>
                {canRegenerate && (
                    <div className="row" style={{ justifyContent: 'flex-end' }}>
                        <button
                            className="btn btn-ghost"
                            onClick={onRegenerate}
                            disabled={disabled || regenerating}
                        >
                            {regenerating ? 'Regenerating...' : 'Regenerate key insights'}
                        </button>
                    </div>
                )}
                {insight ? (
                    <pre
                        style={{
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            fontFamily: 'inherit',
                            lineHeight: 1.5,
                        }}
                    >
                        {insight.content}
                    </pre>
                ) : (
                    <p className="muted" style={{ margin: 0 }}>
                        No key insights yet. Submit a response or regenerate key insights.
                    </p>
                )}
            </div>
        </details>
    );
}
