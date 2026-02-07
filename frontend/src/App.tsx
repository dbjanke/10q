import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard';
import ConversationView from './components/ConversationView';
import LoginPage from './components/LoginPage';
import AdminUsers from './components/AdminUsers';
import { RequireAdmin, RequireAuth } from './components/AuthGate';
import * as api from './hooks/useApi';
import { User } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    try {
      setLoading(true);
      const current = await api.getCurrentUser();
      setUser(current);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  }

  return (
    <BrowserRouter>
      {loading ? (
        <div className="page">
          <div className="center muted">Loading...</div>
        </div>
      ) : (
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/admin/users"
            element={
              <RequireAdmin user={user}>
                <AdminUsers currentUser={user!} onLogout={handleLogout} />
              </RequireAdmin>
            }
          />
          <Route
            path="/"
            element={
              <RequireAuth user={user}>
                <Dashboard currentUser={user!} onLogout={handleLogout} />
              </RequireAuth>
            }
          />
          <Route
            path="/conversation/:id"
            element={
              <RequireAuth user={user}>
                <ConversationView currentUser={user!} onLogout={handleLogout} />
              </RequireAuth>
            }
          />
        </Routes>
      )}
    </BrowserRouter>
  );
}
