export default function LoadingIndicator() {
    return (
        <div className="card" style={{ padding: 16, display: 'flex', justifyContent: 'center', gap: 8 }}>
            <span className="loading-dot" style={{ animationDelay: '0ms' }} />
            <span className="loading-dot" style={{ animationDelay: '150ms' }} />
            <span className="loading-dot" style={{ animationDelay: '300ms' }} />
        </div>
    );
}
