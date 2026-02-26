import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
      <div className="login-page">
        <div className="card login-card">
          <div className="login-card-header">
            <h1 className="login-title">{getAppName()}</h1>
            <p className="login-subtitle">Invalid reset link</p>
          </div>
          <div className="login-form">
            <div className="alert alert-danger">This password reset link is invalid or has expired. Please request a new one.</div>
            <Link to="/forgot-password" className="btn btn-primary" style={{ width: '100%' }}>Request new link</Link>
            <p className="login-forgot-wrap"><Link to="/login" className="login-forgot-link">Back to sign in</Link></p>
          </div>
        </div>
      </div>
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
      <div className="login-page">
        <div className="card login-card">
          <div className="login-card-header">
            <h1 className="login-title">{getAppName()}</h1>
            <p className="login-subtitle">Password reset</p>
          </div>
          <div className="login-form">
            <div className="alert alert-success" style={{ marginBottom: 16 }}>
              Your password has been reset. You can now sign in with your new password.
            </div>
            <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate('/login')}>
              Sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="card login-card">
        <div className="login-card-header">
          <div className="login-logo-wrap">
            <img src="/vmgd-logo.png" alt="VMGD logo" className="login-logo" />
          </div>
          <h1 className="login-title">{getAppName()}</h1>
          <p className="login-subtitle">Set a new password</p>
        </div>
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
          <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
            {loading ? 'Resetting…' : 'Reset password'}
          </button>
          <p className="login-forgot-wrap">
            <Link to="/login" className="login-forgot-link">Back to sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
