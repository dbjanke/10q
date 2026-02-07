import { ReactNode } from 'react';
import { User } from '../types';
import LoginPage from './LoginPage';

interface GuardProps {
    user: User | null;
    children: ReactNode;
}

export function RequireAuth({ user, children }: GuardProps) {
    if (!user) {
        return <LoginPage />;
    }
    return <>{children}</>;
}

export function RequireAdmin({ user, children }: GuardProps) {
    if (!user) {
        return <LoginPage />;
    }

    if (user.role !== 'admin') {
        return (
            <div className="page">
                <div className="center">
                    <div>
                        <p className="muted" style={{ marginBottom: 12 }}>Admin access required</p>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
