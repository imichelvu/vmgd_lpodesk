import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import AuthCardLayout from '../components/AuthCardLayout';

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
    <AuthCardLayout title={getAppName()} subtitle="Sign in to your account">
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
          <Button type="submit" variant="primary" className="login-submit" loading={loading} loadingText="Signing in...">
            Sign in
          </Button>
          <p className="login-forgot-wrap">
            <Link to="/forgot-password" className="login-forgot-link">Forgot password?</Link>
          </p>
        </form>

        <div className="login-troubleshoot">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            style={{ marginBottom: troubleshootOpen ? 12 : 0 }}
            onClick={() => { setTroubleshootOpen((o) => !o); if (!troubleshootOpen) setTroubleshootResult(null); }}
          >
            {troubleshootOpen ? 'Hide troubleshoot' : 'Troubleshoot'}
          </Button>
          {troubleshootOpen && (
            <div className="troubleshoot-content">
              <p className="card-subtitle" style={{ marginBottom: 8 }}>
                API base: <code>{apiBase}</code>
              </p>
              <Button
                type="button"
                variant="secondary"
                style={{ marginBottom: 12 }}
                onClick={runTroubleshoot}
                loading={troubleshootLoading}
                loadingText="Checking..."
              >
                Check backend
              </Button>
              {troubleshootResult && (
                <pre className="troubleshoot-pre">
                  {JSON.stringify(troubleshootResult, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
    </AuthCardLayout>
  );
}
