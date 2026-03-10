import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PSCForm49 from '../components/PSCForm49';
import Form49Preview from '../components/Form49Preview';
import PageHeader from '../components/PageHeader';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';

const DESTINATION_HISTORY_KEY = 'leave.destination.history.v1';
const MAX_DESTINATION_HISTORY = 50;

function normalizeDestination(value) {
  if (!value || typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ');
}

function mergeUniqueDestinations(items = []) {
  const seen = new Set();
  const merged = [];
  for (const raw of items) {
    const value = normalizeDestination(raw);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(value);
  }
  return merged.slice(0, MAX_DESTINATION_HISTORY);
}

function readDestinationHistory() {
  try {
    const raw = localStorage.getItem(DESTINATION_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? mergeUniqueDestinations(parsed) : [];
  } catch (_) {
    return [];
  }
}

function writeDestinationHistory(items) {
  try {
    localStorage.setItem(DESTINATION_HISTORY_KEY, JSON.stringify(mergeUniqueDestinations(items)));
  } catch (_) {
    // Ignore storage failures (private mode, quota, etc.).
  }
}

export default function NewApplication() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { request } = useApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [overlayData, setOverlayData] = useState(null);
  const [registeredSignature, setRegisteredSignature] = useState(null);
  const [destinationSuggestions, setDestinationSuggestions] = useState(() => readDestinationHistory());
  const [toilBalance, setToilBalance] = useState(null);

  // Fetch the user's registered signature once so the preview can display it
  useEffect(() => {
    let cancelled = false;
    if (!user?.has_signature) return undefined;
    request('/profile/signature/data')
      .then((data) => { if (!cancelled) setRegisteredSignature(data?.signature_data || null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.has_signature, request]);

  // Fetch TOIL balance so the form can show available hours when TOIL is selected
  useEffect(() => {
    let cancelled = false;
    request('/leave/toil-balance')
      .then((data) => { if (!cancelled) setToilBalance(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [request]);

  useEffect(() => {
    let cancelled = false;

    const loadSuggestions = async () => {
      try {
        const history = readDestinationHistory();
        const mine = await request('/leave/mine');
        const fromApplications = Array.isArray(mine)
          ? mine.map((app) => app?.destination).filter(Boolean)
          : [];
        const merged = mergeUniqueDestinations([...history, ...fromApplications]);
        if (!cancelled) setDestinationSuggestions(merged);
        writeDestinationHistory(merged);
      } catch (_) {
        if (!cancelled) setDestinationSuggestions(readDestinationHistory());
      }
    };

    loadSuggestions();
    return () => { cancelled = true; };
  }, [request]);

  const handleSubmit = async (data) => {
    setLoading(true);
    setError('');
    try {
      await request('/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const destination = normalizeDestination(data?.destination);
      if (destination) {
        const merged = mergeUniqueDestinations([destination, ...destinationSuggestions]);
        setDestinationSuggestions(merged);
        writeDestinationHistory(merged);
      }
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
          <PageHeader
            title="New leave application"
            subtitle="Complete the form below (PSC Form 4-9)."
          />
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        <PSCForm49
          onSubmit={handleSubmit}
          loading={loading}
          onFormChange={setOverlayData}
          destinationSuggestions={destinationSuggestions}
          toilBalance={toilBalance}
        />
      </div>
      <aside className="apply-page-preview" aria-label="Form 4-9 preview">
        <div className="apply-page-head apply-page-preview-head" aria-hidden="true">
          <PageHeader
            title="Preview"
            subtitle="Complete the form below (PSC Form 4-9)."
            className="apply-preview-title"
          />
        </div>
        <Form49Preview
          user={user}
          formData={overlayData ? { ...overlayData, signature_data: registeredSignature } : null}
        />
      </aside>
    </div>
  );
}
