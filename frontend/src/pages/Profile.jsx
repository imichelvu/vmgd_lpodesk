/**
 * Author: Igor Michel
 * Purpose: User self-service profile page — signature registration and management.
 * Registered signature is used automatically for leave applications and approvals.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import SignatureField from '../components/SignatureField';
import Button from '../components/Button';

export default function Profile() {
  const { user, fetchUser } = useAuth();
  const { request } = useApi();

  const [sigData, setSigData] = useState(null);        // base64 of the current registered sig
  const [draftSig, setDraftSig] = useState(null);      // new sig being drawn
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sigUpdatedAt, setSigUpdatedAt] = useState(null);

  const loadSignature = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // First check if a signature exists
      const status = await request('/profile/signature');
      if (status.has_signature) {
        // Fetch the actual data for preview
        const data = await request('/profile/signature/data');
        setSigData(data.signature_data);
        setSigUpdatedAt(status.updated_at);
      } else {
        setSigData(null);
        setSigUpdatedAt(null);
      }
    } catch (e) {
      setError('Could not load signature status.');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    loadSignature();
  }, [loadSignature]);

  const handleSave = useCallback(async () => {
    if (!draftSig) {
      setError('Please draw your signature before saving.');
      return;
    }
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await request('/profile/signature', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature_data: draftSig }),
      });
      setSigData(draftSig);
      setDraftSig(null);
      setSigUpdatedAt(new Date().toISOString());
      setMessage('Signature saved successfully.');
      // Refresh user context so has_signature reflects the new state immediately
      await fetchUser();
    } catch (e) {
      setError(e?.message || 'Could not save signature.');
    } finally {
      setSaving(false);
    }
  }, [draftSig, request, fetchUser]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm('Remove your registered signature? You will not be able to apply for leave or approve applications until you register a new one.')) return;
    setDeleting(true);
    setMessage('');
    setError('');
    try {
      await request('/profile/signature', { method: 'DELETE' });
      setSigData(null);
      setDraftSig(null);
      setSigUpdatedAt(null);
      setMessage('Signature removed.');
      await fetchUser();
    } catch (e) {
      setError(e?.message || 'Could not remove signature.');
    } finally {
      setDeleting(false);
    }
  }, [request, fetchUser]);

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Manage your identity details and registered signature.</p>
      </div>

      {/* Identity card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 className="card-title">Identity</h2>
        <div className="dashboard-accordion-grid" style={{ marginTop: '0.75rem' }}>
          <p><strong>Full name:</strong> {user?.full_name || '—'}</p>
          <p><strong>Username:</strong> {user?.username || '—'}</p>
          <p><strong>Email:</strong> {user?.email || '—'}</p>
          <p><strong>Post title:</strong> {user?.post_title || '—'}</p>
          <p><strong>Division:</strong> {user?.division_name || '—'}</p>
          <p><strong>Grade:</strong> {user?.grade || '—'}</p>
          <p><strong>Department:</strong> {user?.department || '—'}</p>
          <p><strong>Ministry:</strong> {user?.ministry || '—'}</p>
        </div>
        <p className="text-muted" style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>
          To update your details, contact an Administrator via the{' '}
          <Link to="/admin">Admin panel</Link>.
        </p>
      </div>

      {/* Signature registration card */}
      <div className="card">
        <h2 className="card-title">Registered Signature</h2>
        <p className="card-subtitle" style={{ marginTop: '0.25rem' }}>
          Your signature is stored securely and used automatically when you submit a leave application
          or approve/disapprove applications. You must have a registered signature to perform those actions.
        </p>

        {loading ? (
          <p className="text-muted" style={{ marginTop: '1rem' }}>Loading…</p>
        ) : (
          <>
            {message && <div className="alert alert-success" style={{ marginTop: '1rem' }}>{message}</div>}
            {error && <div className="alert alert-danger" style={{ marginTop: '1rem' }}>{error}</div>}

            {/* Current registered signature preview */}
            {sigData ? (
              <div style={{ marginTop: '1rem' }}>
                <p className="text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  Currently registered{sigUpdatedAt ? ` · Last updated ${formatDate(sigUpdatedAt)}` : ''}
                </p>
                <div style={{
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 8,
                  background: 'var(--surface)',
                  display: 'inline-block',
                }}>
                  <img
                    src={sigData}
                    alt="Your registered signature"
                    style={{ display: 'block', maxWidth: 320, maxHeight: 120 }}
                  />
                </div>
                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Button
                    type="button"
                    variant="danger"
                    loading={deleting}
                    loadingText="Removing…"
                    onClick={handleDelete}
                  >
                    Remove signature
                  </Button>
                </div>
              </div>
            ) : (
              <div className="alert alert-warning" style={{ marginTop: '1rem' }}>
                No signature registered. Draw and save your signature below to enable leave applications
                and approvals.
              </div>
            )}

            {/* New signature input */}
            <div style={{ marginTop: '1.5rem' }}>
              <SignatureField
                label={sigData ? 'Draw a new signature to replace the current one' : 'Draw your signature'}
                hint="Use your mouse or touchscreen. Click Clear to start over."
                width={400}
                height={140}
                value={draftSig}
                onChange={setDraftSig}
              />
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Button
                  type="button"
                  variant="primary"
                  loading={saving}
                  loadingText="Saving…"
                  onClick={handleSave}
                  disabled={!draftSig}
                >
                  {sigData ? 'Save new signature' : 'Register signature'}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
