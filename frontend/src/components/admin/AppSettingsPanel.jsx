/**
 * Author: Igor Michel
 * Purpose: Admin panel for editing configurable app settings (e.g. TOIL multiplier, expiry).
 * Values are stored in app_settings table and affect TOIL balance calculations.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useApi } from '../../hooks/useApi';
import Button from '../Button';

const FIELD_META = {
  toil_multiplier: {
    type: 'number', min: 1, max: 5, step: 0.05,
    hint: 'Hours of time off earned per hour of overtime (PSSRM s.4.1(b)/(c)). Default: 1.25.',
  },
  toil_expiry_months: {
    type: 'number', min: 1, max: 36, step: 1,
    hint: 'TOIL must be taken within this many months of the approved overtime date (PSSRM s.4.1(b)). Default: 3.',
  },
};

export default function AppSettingsPanel({ onError }) {
  const { request } = useApi();
  const [settings, setSettings] = useState({});
  const [drafts, setDrafts] = useState({});
  const [saving, setSaving] = useState({});
  const [messages, setMessages] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request('/settings');
      setSettings(data || {});
      const initial = {};
      for (const key of Object.keys(FIELD_META)) {
        initial[key] = data?.[key]?.value ?? '';
      }
      setDrafts(initial);
    } catch (e) {
      onError?.(e?.message || 'Could not load settings.');
    } finally {
      setLoading(false);
    }
  }, [request, onError]);

  useEffect(() => { load(); }, [load]);

  const handleSave = useCallback(async (key) => {
    setSaving((prev) => ({ ...prev, [key]: true }));
    setMessages((prev) => ({ ...prev, [key]: '' }));
    try {
      const updated = await request(`/settings/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: drafts[key] }),
      });
      setSettings((prev) => ({ ...prev, [key]: { ...prev[key], value: updated.value, updated_at: updated.updated_at } }));
      setMessages((prev) => ({ ...prev, [key]: 'Saved.' }));
    } catch (e) {
      setMessages((prev) => ({ ...prev, [key]: e?.message || 'Save failed.' }));
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  }, [drafts, request]);

  if (loading) return <p className="text-muted">Loading settings…</p>;

  return (
    <div className="card">
      <h2 className="card-title">Overtime & TOIL Rules</h2>
      <p className="card-subtitle" style={{ marginTop: '0.25rem' }}>
        Configure how Time Off In Lieu is calculated and how long it remains claimable.
        Changes apply immediately to all users' TOIL balances.
      </p>

      <div style={{ marginTop: '1.5rem', display: 'grid', gap: '1.5rem' }}>
        {Object.entries(FIELD_META).map(([key, meta]) => {
          const setting = settings[key] || {};
          const isDirty = String(drafts[key]) !== String(setting.value ?? '');
          const msg = messages[key];
          return (
            <div key={key} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
              <label htmlFor={`setting-${key}`} style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
                {setting.label || key}
              </label>
              {setting.description && (
                <p className="text-muted" style={{ fontSize: '0.83rem', margin: '0 0 0.5rem' }}>
                  {setting.description}
                </p>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  id={`setting-${key}`}
                  type={meta.type}
                  min={meta.min}
                  max={meta.max}
                  step={meta.step}
                  value={drafts[key] ?? ''}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                  style={{ maxWidth: 140 }}
                />
                <Button
                  type="button"
                  variant="primary"
                  loading={saving[key]}
                  loadingText="Saving…"
                  onClick={() => handleSave(key)}
                  disabled={!isDirty || saving[key]}
                >
                  Save
                </Button>
                {msg && (
                  <span style={{ fontSize: '0.85rem', color: msg === 'Saved.' ? 'var(--success)' : 'var(--danger)' }}>
                    {msg}
                  </span>
                )}
              </div>
              <p className="form-hint" style={{ marginTop: '0.35rem' }}>{meta.hint}</p>
              {setting.updated_at && (
                <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: '0.2rem' }}>
                  Last updated: {new Date(setting.updated_at).toLocaleString()}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
