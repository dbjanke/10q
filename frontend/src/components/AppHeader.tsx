import { Link, useLocation } from 'react-router-dom';
import { User } from '../types';

interface AppHeaderProps {
    user: User;
    onLogout: () => void;
}

export default function AppHeader({ user, onLogout }: AppHeaderProps) {
    const location = useLocation();
    const isAdmin = user.role === 'admin';

    return (
        <div className="toolbar" style={{ marginBottom: 28, alignItems: 'flex-start' }}>
            <div>
                <h1 className="section-title">10Q</h1>
                <p className="section-subtitle">Guided thinking through 10 questions</p>
            </div>
            <div className="row" style={{ gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {isAdmin && (
                    <Link
                        to="/admin/users"
                        className={location.pathname.startsWith('/admin') ? 'btn btn-soft' : 'btn btn-ghost'}
                    >
                        Admin
                    </Link>
                )}
                <div className="card" style={{ padding: '8px 12px', borderRadius: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{user.name || user.email}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{user.email}</div>
                </div>
                <button onClick={onLogout} className="btn btn-ghost">
                    Sign out
                </button>
            </div>
        </div>
    );
}
