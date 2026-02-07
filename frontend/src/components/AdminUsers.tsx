import { useEffect, useState } from 'react';
import { Group, Permission, User } from '../types';
import { MAX_GROUP_NAME_LENGTH } from '../config/validation';
import * as api from '../hooks/useApi';
import AppHeader from './AppHeader';

interface AdminUsersProps {
    currentUser: User;
    onLogout: () => void;
}

export default function AdminUsers({ currentUser, onLogout }: AdminUsersProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [groupsLoading, setGroupsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'admin' | 'user'>('user');
    const [submitting, setSubmitting] = useState(false);
    const [groups, setGroups] = useState<Group[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [newGroupName, setNewGroupName] = useState('');
    const [groupSubmitting, setGroupSubmitting] = useState(false);

    useEffect(() => {
        loadUsers();
        loadGroups();
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

    async function loadGroups() {
        try {
            setGroupsLoading(true);
            const [permissionsList, groupsList] = await Promise.all([
                api.getPermissions(),
                api.getGroups(),
            ]);
            setPermissions(permissionsList);
            setGroups(groupsList);
        } catch (err) {
            setError('Failed to load groups');
            console.error(err);
        } finally {
            setGroupsLoading(false);
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

    async function updateUserGroups(id: number, groupIds: number[]) {
        try {
            await api.updateUser(id, { groupIds });
            await loadUsers();
            await loadGroups();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update user groups';
            setError(message);
            console.error(err);
        }
    }

    async function handleCreateGroup(e: React.FormEvent) {
        e.preventDefault();
        if (!newGroupName.trim()) return;

        try {
            setGroupSubmitting(true);
            await api.createGroup(newGroupName.trim());
            setNewGroupName('');
            await loadGroups();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create group';
            setError(message);
            console.error(err);
        } finally {
            setGroupSubmitting(false);
        }
    }

    async function handleRenameGroup(group: Group) {
        const nextName = prompt('Rename group', group.name);
        if (!nextName || !nextName.trim() || nextName.trim() === group.name) return;

        try {
            await api.updateGroup(group.id, { name: nextName.trim() });
            await loadGroups();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to rename group';
            setError(message);
            console.error(err);
        }
    }

    async function handleTogglePermission(group: Group, permission: Permission) {
        const permissionsSet = new Set(group.permissions);
        if (permissionsSet.has(permission)) {
            permissionsSet.delete(permission);
        } else {
            permissionsSet.add(permission);
        }

        try {
            await api.updateGroup(group.id, { permissions: Array.from(permissionsSet) });
            await loadGroups();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update permissions';
            setError(message);
            console.error(err);
        }
    }

    async function handleDeleteGroup(group: Group) {
        if (!confirm(`Delete group "${group.name}"?`)) return;

        try {
            await api.deleteGroup(group.id);
            await loadGroups();
            await loadUsers();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete group';
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

                <div style={{ marginBottom: 24 }}>
                    <a href="/" className="btn btn-ghost">← Back to Dashboard</a>
                </div>

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

                <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                    <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Groups & Permissions</h2>
                    <p className="muted" style={{ marginBottom: 16 }}>
                        Manage permission groups and assign them to users.
                    </p>
                    <form onSubmit={handleCreateGroup} className="row" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 220 }}>
                            <label className="muted" style={{ fontSize: 12, fontWeight: 600 }}>Group name</label>
                            <input
                                type="text"
                                className="input"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                placeholder="prompt-tools"
                                maxLength={MAX_GROUP_NAME_LENGTH}
                                disabled={groupSubmitting}
                            />
                        </div>
                        <button className="btn btn-primary" type="submit" disabled={groupSubmitting || !newGroupName.trim()}>
                            {groupSubmitting ? 'Creating...' : 'Create group'}
                        </button>
                    </form>

                    {groupsLoading ? (
                        <div className="center muted" style={{ marginTop: 16 }}>Loading groups...</div>
                    ) : (
                        <div className="stack" style={{ marginTop: 16 }}>
                            {groups.length === 0 ? (
                                <div className="muted">No groups yet.</div>
                            ) : (
                                groups.map((group) => (
                                    <div key={group.id} className="card" style={{ padding: 16 }}>
                                        <div className="row" style={{ alignItems: 'center', gap: 12 }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600 }}>{group.name}</div>
                                                <div className="muted" style={{ fontSize: 13 }}>
                                                    {group.memberIds?.length || 0} members
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                <button className="btn btn-ghost" onClick={() => handleRenameGroup(group)}>
                                                    Rename
                                                </button>
                                                <button className="btn btn-danger" onClick={() => handleDeleteGroup(group)}>
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                        <div className="row" style={{ marginTop: 12, flexWrap: 'wrap', gap: 12 }}>
                                            {permissions.map((permission) => (
                                                <label key={permission} className="row" style={{ gap: 6 }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={group.permissions.includes(permission)}
                                                        onChange={() => handleTogglePermission(group, permission)}
                                                    />
                                                    <span className="muted" style={{ fontSize: 13 }}>{permission}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
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
                                                <div>
                                                    <div style={{ fontWeight: 600 }}>{user.name || user.email}</div>
                                                    <div className="muted" style={{ fontSize: 13 }}>{user.email}</div>
                                                </div>
                                                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                    <span className="pill">Role: {user.role}</span>
                                                    <span className="pill">Status: {user.status}</span>
                                                    {groups.length > 0 && user.groupIds && user.groupIds.length > 0 && (
                                                        <span className="pill">
                                                            Groups: {groups.filter((g) => user.groupIds?.includes(g.id)).map((g) => g.name).join(', ')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                                                    <button
                                                        className="btn btn-danger"
                                                        style={{ padding: '6px 10px', fontSize: 12, lineHeight: '16px' }}
                                                        onClick={() => removeUser(user.id)}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
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
                                                {groups.length > 0 && (
                                                    <div className="stack" style={{ gap: 6 }}>
                                                        {groups.map((group) => (
                                                            <label key={group.id} className="row" style={{ gap: 6, alignItems: 'center' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={user.groupIds?.includes(group.id) || false}
                                                                    onChange={() => {
                                                                        const currentIds = new Set(user.groupIds || []);
                                                                        if (currentIds.has(group.id)) {
                                                                            currentIds.delete(group.id);
                                                                        } else {
                                                                            currentIds.add(group.id);
                                                                        }
                                                                        updateUserGroups(user.id, Array.from(currentIds));
                                                                    }}
                                                                />
                                                                <span className="muted" style={{ fontSize: 12, lineHeight: '16px' }}>{group.name}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
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
