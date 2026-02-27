import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import AuthCardLayout from '../components/AuthCardLayout';

const API_BASE = (import.meta.env.VITE_API_URL ?? '').trim() || '/api';

function getAppName() {
  return (import.meta.env.VITE_APP_NAME ?? '').trim();
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const name = getAppName();
    if (name && typeof document !== 'undefined') document.title = `Set new password – ${name}`;
  }, []);

  if (user) return <Navigate to="/" replace />;

  if (!token.trim()) {
    return (
      <AuthCardLayout title={getAppName()} subtitle="Invalid reset link" showLogo={false}>
          <div className="login-form">
            <div className="alert alert-danger">This password reset link is invalid or has expired. Please request a new one.</div>
            <Button to="/forgot-password" variant="primary" fullWidth>
              Request new link
            </Button>
            <p className="login-forgot-wrap"><Link to="/login" className="login-forgot-link">Back to sign in</Link></p>
          </div>
      </AuthCardLayout>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE.replace(/\/$/, '')}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to reset password');
        return;
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthCardLayout title={getAppName()} subtitle="Password reset" showLogo={false}>
          <div className="login-form">
            <div className="alert alert-success" style={{ marginBottom: 16 }}>
              Your password has been reset. You can now sign in with your new password.
            </div>
            <Button type="button" variant="primary" fullWidth onClick={() => navigate('/login')}>
              Sign in
            </Button>
          </div>
      </AuthCardLayout>
    );
  }

  return (
    <AuthCardLayout title={getAppName()} subtitle="Set a new password">
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="form-group">
            <label htmlFor="reset-password">New password</label>
            <input
              id="reset-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="At least 6 characters"
            />
          </div>
          <div className="form-group">
            <label htmlFor="reset-confirm">Confirm new password</label>
            <input
              id="reset-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Re-enter your new password"
            />
          </div>
          <Button type="submit" variant="primary" className="login-submit" loading={loading} loadingText="Resetting…">
            Reset password
          </Button>
          <p className="login-forgot-wrap">
            <Link to="/login" className="login-forgot-link">Back to sign in</Link>
          </p>
        </form>
    </AuthCardLayout>
  );
}
