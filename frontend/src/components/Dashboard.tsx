import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Conversation, User } from '../types';
import * as api from '../hooks/useApi';
import { MAX_TITLE_LENGTH } from '../config/validation';
import AppHeader from './AppHeader';

interface DashboardProps {
  currentUser: User;
  onLogout: () => void;
}

export default function Dashboard({ currentUser, onLogout }: DashboardProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [articleFile, setArticleFile] = useState<File | null>(null);
  const [articleContext, setArticleContext] = useState<{ keyInsights: string; summary: string } | null>(null);
  const [articleTruncated, setArticleTruncated] = useState(false);
  const [uploadingArticle, setUploadingArticle] = useState(false);
  const [articleUploadError, setArticleUploadError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    try {
      setLoading(true);
      const data = await api.getAllConversations();
      setConversations(data);
      setError(null);
    } catch (err) {
      setError('Failed to load conversations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleArticleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setArticleFile(file);
    setArticleContext(null);
    setArticleTruncated(false);
    setArticleUploadError(null);
    setUploadingArticle(true);

    try {
      const { truncated, ...context } = await api.uploadArticle(file);
      setArticleContext(context);
      setArticleTruncated(truncated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to process article';
      setArticleUploadError(msg);
      setArticleFile(null);
    } finally {
      setUploadingArticle(false);
    }
  }

  function handleCloseModal() {
    setShowNewModal(false);
    setNewTitle('');
    setModalError(null);
    setArticleFile(null);
    setArticleContext(null);
    setArticleTruncated(false);
    setArticleUploadError(null);
    setUploadingArticle(false);
  }

  async function handleCreateConversation(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || newTitle.length > MAX_TITLE_LENGTH) return;

    try {
      setCreating(true);
      setModalError(null);
      const result = await api.createConversation(
        newTitle.trim(),
        articleContext
          ? { contextSummary: articleContext.summary, contextKeyInsights: articleContext.keyInsights }
          : undefined
      );
      navigate(`/conversation/${result.conversation.id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create conversation';
      setModalError(errorMessage);
      console.error(err);
      setCreating(false);
    }
  }

  async function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this conversation?')) return;

    try {
      await api.deleteConversation(id);
      await loadConversations();
    } catch (err) {
      setError('Failed to delete conversation');
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="center muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <AppHeader user={currentUser} onLogout={onLogout} />

        <div className="toolbar" style={{ marginTop: 12 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700 }}>Your conversations</h2>
            <p className="section-subtitle">Pick up where you left off</p>
          </div>
          <button
            onClick={() => {
              setShowNewModal(true);
              setModalError(null);
            }}
            className="btn btn-primary"
          >
            Start New Conversation
          </button>
        </div>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {conversations.length === 0 ? (
          <div className="card card-item" style={{ textAlign: 'center' }}>
            <p className="muted" style={{ marginBottom: 12 }}>No conversations yet</p>
            <button
              onClick={() => {
                setShowNewModal(true);
                setModalError(null);
              }}
              className="btn btn-soft"
            >
              Create your first conversation
            </button>
          </div>
        ) : (
          <div className="list">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => navigate(`/conversation/${conv.id}`)}
                className="card card-item card-hover"
              >
                <div className="row" style={{ alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
                      {conv.title}
                    </h3>
                    <div className="card-meta" style={{ marginBottom: 10 }}>
                      <span>{new Date(conv.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>
                        {conv.completed
                          ? 'Completed'
                          : `Question ${conv.currentQuestionNumber}/10`}
                      </span>
                    </div>
                    {conv.summary && (
                      <p className="muted line-clamp-2">{conv.summary}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDelete(conv.id, e)}
                    className="btn btn-danger"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNewModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2 className="modal-title">
              New Conversation
            </h2>
            <form onSubmit={handleCreateConversation}>
              <label className="muted" style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                What would you like to explore?
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Enter a topic or question..."
                className="input"
                maxLength={MAX_TITLE_LENGTH}
                autoFocus
                disabled={creating}
              />
              <div
                className="muted-small"
                style={{
                  marginTop: 8,
                  textAlign: 'right',
                  color: newTitle.length > MAX_TITLE_LENGTH - 20 ? '#c2410c' : undefined,
                  fontWeight: newTitle.length > MAX_TITLE_LENGTH - 20 ? 600 : undefined,
                }}
              >
                {newTitle.length} / {MAX_TITLE_LENGTH} characters
              </div>
              <div style={{ marginTop: 20 }}>
                <label className="muted" style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, display: 'block' }}>
                  Add an article for context (optional)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleArticleFileChange}
                    disabled={creating || uploadingArticle}
                    style={{ display: 'block', width: '100%' }}
                  />
                  {uploadingArticle && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      background: 'var(--color-surface, #fff)',
                      borderRadius: 6,
                      border: '1px solid var(--color-border, #e5e7eb)',
                    }}>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}
                      >
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      <span className="muted-small">Processing article...</span>
                    </div>
                  )}
                </div>
                {articleContext && !uploadingArticle && (
                  <>
                    <p className="muted-small" style={{ marginTop: 6, color: '#16a34a' }}>
                      Article ready: {articleFile?.name}
                    </p>
                    {articleTruncated && (
                      <p className="muted-small" style={{ marginTop: 4, color: '#92400e' }}>
                        Note: this article is long and was partially analyzed. The first ~20,000 words were used.
                      </p>
                    )}
                  </>
                )}
                {articleUploadError && (
                  <p className="muted-small" style={{ marginTop: 6, color: '#c2410c' }}>{articleUploadError}</p>
                )}
              </div>

              {modalError && (
                <div className="error" style={{ marginTop: 12 }}>
                  {modalError}
                </div>
              )}
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn btn-ghost"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim() || newTitle.length > MAX_TITLE_LENGTH || creating || uploadingArticle}
                  className="btn btn-primary"
                >
                  {creating ? 'Creating...' : 'Start'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
