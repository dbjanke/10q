import { useSearchParams } from 'react-router-dom';

export default function LoginPage() {
    const [params] = useSearchParams();
    const error = params.get('error');

    const errorMessage =
        error === 'not_allowed'
            ? 'Your account is not on the allowlist. Contact an admin for access.'
            : error
                ? 'Login failed. Please try again.'
                : null;

    return (
        <div className="page">
            <div className="container" style={{ maxWidth: 640 }}>
                <div className="card" style={{ padding: 32 }}>
                    <h1 className="section-title" style={{ marginBottom: 8 }}>Welcome to 10Q</h1>
                    <p className="section-subtitle" style={{ marginBottom: 24 }}>
                        Sign in with Google to continue.
                    </p>
                    {errorMessage && (
                        <div className="error" style={{ marginBottom: 16 }}>{errorMessage}</div>
                    )}
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            window.location.href = '/api/auth/google';
                        }}
                    >
                        Continue with Google
                    </button>
                </div>
            </div>
        </div>
    );
}
