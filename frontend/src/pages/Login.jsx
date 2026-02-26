import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function getAppName() {
  return (import.meta.env.VITE_APP_NAME ?? '').trim();
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [troubleshootOpen, setTroubleshootOpen] = useState(false);
  const [troubleshootResult, setTroubleshootResult] = useState(null);
  const [troubleshootLoading, setTroubleshootLoading] = useState(false);
  const { login, user, apiBase } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const name = getAppName();
    if (name && typeof document !== 'undefined') document.title = name;
  }, []);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const runTroubleshoot = async () => {
    setTroubleshootLoading(true);
    setTroubleshootResult(null);
    try {
      const url = `${apiBase.replace(/\/$/, '')}/troubleshoot`;
      const res = await fetch(url);
      const text = await res.text();
      let data = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = { ok: false, error: 'Invalid JSON response', raw: text.slice(0, 200) };
        }
      }
      if (!data) data = { ok: false, error: `HTTP ${res.status}`, status: res.status };
      setTroubleshootResult({ ...data, status: res.status, url });
    } catch (err) {
      setTroubleshootResult({
        ok: false,
        error: err.message || 'Request failed',
        hint: 'Is the backend running? Try http://127.0.0.1:4000/api/troubleshoot in the browser.',
      });
    } finally {
      setTroubleshootLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="card login-card">
        <div className="login-card-header">
          <div className="login-logo-wrap">
            <img src="/vmgd-logo.png" alt="VMGD logo" className="login-logo" />
          </div>
          <h1 className="login-title">{getAppName()}</h1>
          <p className="login-subtitle">Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="form-group">
            <label htmlFor="login-username">Email or username</label>
            <input
              id="login-username"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              placeholder="e.g. imichel or you@vmgd.gov.vu"
            />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
            />
          </div>
          <button type="submit" className="btn btn-primary login-submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
          <p className="login-forgot-wrap">
            <Link to="/forgot-password" className="login-forgot-link">Forgot password?</Link>
          </p>
        </form>

        <div className="login-troubleshoot">
          <button
            type="button"
            className="btn btn-secondary"
            style={{ width: '100%', marginBottom: troubleshootOpen ? 12 : 0 }}
            onClick={() => { setTroubleshootOpen((o) => !o); if (!troubleshootOpen) setTroubleshootResult(null); }}
          >
            {troubleshootOpen ? 'Hide troubleshoot' : 'Troubleshoot'}
          </button>
          {troubleshootOpen && (
            <div className="troubleshoot-content">
              <p className="card-subtitle" style={{ marginBottom: 8 }}>
                API base: <code>{apiBase}</code>
              </p>
              <button type="button" className="btn btn-secondary" style={{ marginBottom: 12 }} onClick={runTroubleshoot} disabled={troubleshootLoading}>
                {troubleshootLoading ? 'Checking...' : 'Check backend'}
              </button>
              {troubleshootResult && (
                <pre className="troubleshoot-pre">
                  {JSON.stringify(troubleshootResult, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
