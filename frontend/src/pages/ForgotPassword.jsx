import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import AuthCardLayout from '../components/AuthCardLayout';

const API_BASE = (import.meta.env.VITE_API_URL ?? '').trim() || '/api';

function getAppName() {
  return (import.meta.env.VITE_APP_NAME ?? '').trim();
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const name = getAppName();
    if (name && typeof document !== 'undefined') document.title = `Forgot password – ${name}`;
  }, []);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSent(false);
    try {
      const res = await fetch(`${API_BASE.replace(/\/$/, '')}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Request failed');
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCardLayout title={getAppName()} subtitle="Reset your password">
        {sent ? (
          <div className="login-form">
            <div className="alert alert-success" style={{ marginBottom: 16 }}>
              If an account exists with that email, we&apos;ve sent a password reset link. Please check your inbox (and spam folder).
            </div>
            <Button to="/login" variant="primary" fullWidth>
              Back to sign in
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="form-group">
              <label htmlFor="forgot-email">Email address</label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="Enter your email"
              />
            </div>
            <Button type="submit" variant="primary" className="login-submit" loading={loading} loadingText="Sending…">
              Send reset link
            </Button>
            <p className="login-forgot-wrap">
              <Link to="/login" className="login-forgot-link">Back to sign in</Link>
            </p>
          </form>
        )}
    </AuthCardLayout>
  );
}
