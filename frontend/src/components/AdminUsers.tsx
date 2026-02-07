import { useEffect, useState } from 'react';
import { User } from '../types';
import * as api from '../hooks/useApi';
import AppHeader from './AppHeader';

interface AdminUsersProps {
    currentUser: User;
    onLogout: () => void;
}

export default function AdminUsers({ currentUser, onLogout }: AdminUsersProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'admin' | 'user'>('user');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    async function loadUsers() {
        try {
            setLoading(true);
            const data = await api.getUsers();
            setUsers(data);
            setError(null);
        } catch (err) {
            setError('Failed to load users');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleInvite(e: React.FormEvent) {
        e.preventDefault();
        if (!inviteEmail.trim()) return;

        try {
            setSubmitting(true);
            await api.inviteUser(inviteEmail.trim(), inviteRole);
            setInviteEmail('');
            setInviteRole('user');
            await loadUsers();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to invite user';
            setError(message);
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    }

    async function updateUser(id: number, updates: Partial<Pick<User, 'role' | 'status'>>) {
        try {
            await api.updateUser(id, updates);
            await loadUsers();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update user';
            setError(message);
            console.error(err);
        }
    }

    async function removeUser(id: number) {
        if (!confirm('Remove this user from the allowlist?')) return;

        try {
            await api.deleteUser(id);
            await loadUsers();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete user';
            setError(message);
            console.error(err);
        }
    }

    return (
        <div className="page">
            <div className="container">
                <AppHeader user={currentUser} onLogout={onLogout} />

                <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                    <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Allowlist</h2>
                    <p className="muted" style={{ marginBottom: 16 }}>
                        Invite people by email. Access is granted once they log in with Google.
                    </p>
                    <form onSubmit={handleInvite} className="row" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 220 }}>
                            <label className="muted" style={{ fontSize: 12, fontWeight: 600 }}>Email</label>
                            <input
                                type="email"
                                className="input"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="name@example.com"
                                disabled={submitting}
                            />
                        </div>
                        <div>
                            <label className="muted" style={{ fontSize: 12, fontWeight: 600 }}>Role</label>
                            <select
                                className="input"
                                value={inviteRole}
                                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'user')}
                                disabled={submitting}
                            >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <button className="btn btn-primary" type="submit" disabled={submitting || !inviteEmail.trim()}>
                            {submitting ? 'Inviting...' : 'Invite'}
                        </button>
                    </form>
                </div>

                {error && (
                    <div className="error" style={{ marginBottom: 16 }}>{error}</div>
                )}

                {loading ? (
                    <div className="center muted">Loading users...</div>
                ) : (
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
                            <strong>Users</strong>
                        </div>
                        <div className="list" style={{ padding: 16 }}>
                            {users.length === 0 ? (
                                <div className="muted">No users yet.</div>
                            ) : (
                                users.map((user) => (
                                    <div key={user.id} className="card" style={{ padding: 16 }}>
                                        <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600 }}>{user.name || user.email}</div>
                                                <div className="muted" style={{ fontSize: 13 }}>{user.email}</div>
                                                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                    <span className="pill">Role: {user.role}</span>
                                                    <span className="pill">Status: {user.status}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                <select
                                                    className="input"
                                                    style={{ minWidth: 120 }}
                                                    value={user.role}
                                                    onChange={(e) => updateUser(user.id, { role: e.target.value as 'admin' | 'user' })}
                                                >
                                                    <option value="user">User</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                                <select
                                                    className="input"
                                                    style={{ minWidth: 140 }}
                                                    value={user.status}
                                                    onChange={(e) => updateUser(user.id, { status: e.target.value as User['status'] })}
                                                >
                                                    <option value="invited">Invited</option>
                                                    <option value="active">Active</option>
                                                    <option value="disabled">Disabled</option>
                                                </select>
                                                <button className="btn btn-danger" onClick={() => removeUser(user.id)}>
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
