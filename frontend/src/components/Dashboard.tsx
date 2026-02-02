import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Conversation } from '../types';
import * as api from '../hooks/useApi';

export default function Dashboard() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
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

  async function handleCreateConversation(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setCreating(true);
      const result = await api.createConversation(newTitle.trim());
      navigate(`/conversation/${result.conversation.id}`);
    } catch (err) {
      setError('Failed to create conversation');
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">10Q</h1>
            <p className="text-gray-600 mt-1">Guided thinking through 10 questions</p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Start New Conversation
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {conversations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 mb-4">No conversations yet</p>
            <button
              onClick={() => setShowNewModal(true)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first conversation
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => navigate(`/conversation/${conv.id}`)}
                className="bg-white rounded-lg shadow hover:shadow-md transition cursor-pointer p-6"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {conv.title}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                      <span>{new Date(conv.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>
                        {conv.completed
                          ? 'Completed'
                          : `Question ${conv.currentQuestionNumber}/10`}
                      </span>
                    </div>
                    {conv.summary && (
                      <p className="text-gray-600 line-clamp-2">{conv.summary}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDelete(conv.id, e)}
                    className="ml-4 text-red-600 hover:text-red-700 text-sm font-medium"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              New Conversation
            </h2>
            <form onSubmit={handleCreateConversation}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What would you like to explore?
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Enter a topic or question..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
                disabled={creating}
              />
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewModal(false);
                    setNewTitle('');
                  }}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim() || creating}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
