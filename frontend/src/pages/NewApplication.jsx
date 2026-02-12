import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PSCForm49 from '../components/PSCForm49';
import Form49Preview from '../components/Form49Preview';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';

export default function NewApplication() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { request } = useApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [overlayData, setOverlayData] = useState(null);

  const handleSubmit = async (data) => {
    setLoading(true);
    setError('');
    try {
      await request('/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      navigate('/');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="apply-page">
      <div className="apply-page-form">
        <div className="apply-page-head">
          <h2>New leave application</h2>
          <p style={{ color: 'var(--text-muted)' }}>Complete the form below (PSC Form 4-9).</p>
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        <PSCForm49
          onSubmit={handleSubmit}
          loading={loading}
          onFormChange={setOverlayData}
        />
      </div>
      <aside className="apply-page-preview" aria-label="Form 4-9 preview">
        <div className="apply-page-head apply-page-preview-head" aria-hidden="true">
          <h2>Preview</h2>
          <p style={{ color: 'var(--text-muted)', visibility: 'hidden' }}>Complete the form below (PSC Form 4-9).</p>
        </div>
        <Form49Preview user={user} formData={overlayData} />
      </aside>
    </div>
  );
}
