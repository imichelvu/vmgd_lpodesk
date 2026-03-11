/**
 * Author: Igor Michel
 * Purpose: Form for creating a new procurement request with optional document upload.
 * Last updated: 2026-03-11
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';

const CATEGORIES = ['ICT Equipment', 'Office Supplies', 'Services', 'Maintenance', 'Consultancy'];
const PAYMENT_TYPES = ['LPO', 'Direct Payment'];
const BUDGET_TYPES = ['Recurrent', 'Projects'];

export default function CreateRequest() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    description: '',
    supplier_name: '',
    quote_number: '',
    amount: '',
    category: '',
    payment_type: 'LPO',
    budget_type: '',
  });
  const [file, setFile] = useState(null);
  const [submitNow, setSubmitNow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError('Title is required');
    if (!form.category) return setError('Category is required');
    setError('');
    setLoading(true);
    try {
      // 1. Create the request
      const res = await api('/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: form.amount ? parseFloat(form.amount) : null,
          budget_type: form.budget_type || null,
          quote_number: form.quote_number || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create request');
      const requestId = data.id;

      // 2. Upload file if provided
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('request_id', requestId);
        const uploadRes = await api('/documents/upload', { method: 'POST', body: fd });
        if (!uploadRes.ok) {
          const ud = await uploadRes.json().catch(() => ({}));
          console.warn('Document upload failed:', ud.error);
        }
      }

      // 3. Submit immediately if checkbox ticked
      if (submitNow) {
        const subRes = await api(`/requests/${requestId}/submit`, { method: 'POST' });
        if (!subRes.ok) {
          const sd = await subRes.json().catch(() => ({}));
          console.warn('Auto-submit failed:', sd.error);
        }
      }

      navigate(`/requests/${requestId}`);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content">
      <PageHeader title="New Procurement Request" subtitle="Fill in the details and attach a supplier quote" />

      <div className="form-card" style={{ maxWidth: 680 }}>
        {error && <div className="alert alert-danger" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>

          {/* ── Section 1: Payment & Budget Type ── */}
          <fieldset className="form-section" style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
            <legend style={{ fontWeight: 600, fontSize: '0.875rem', color: '#475569', padding: '0 0.5rem' }}>Payment &amp; Budget</legend>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Payment Type <span className="required">*</span></label>
                <div style={{ display: 'flex', gap: '1.5rem', paddingTop: '0.4rem' }}>
                  {PAYMENT_TYPES.map((pt) => (
                    <label key={pt} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: form.payment_type === pt ? 600 : 400 }}>
                      <input
                        type="radio"
                        name="payment_type"
                        value={pt}
                        checked={form.payment_type === pt}
                        onChange={handleChange}
                      />
                      {pt}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Budget Type</label>
                <div style={{ display: 'flex', gap: '1.5rem', paddingTop: '0.4rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: !form.budget_type ? 600 : 400 }}>
                    <input
                      type="radio"
                      name="budget_type"
                      value=""
                      checked={!form.budget_type}
                      onChange={handleChange}
                    />
                    — not set —
                  </label>
                  {BUDGET_TYPES.map((bt) => (
                    <label key={bt} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: form.budget_type === bt ? 600 : 400 }}>
                      <input
                        type="radio"
                        name="budget_type"
                        value={bt}
                        checked={form.budget_type === bt}
                        onChange={handleChange}
                      />
                      {bt}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </fieldset>

          {/* ── Section 2: Goods/Works/Category ── */}
          <fieldset className="form-section" style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
            <legend style={{ fontWeight: 600, fontSize: '0.875rem', color: '#475569', padding: '0 0.5rem' }}>Goods / Works / Consultant / Services</legend>

            <div className="form-group">
              <label className="form-label" htmlFor="category">Category <span className="required">*</span></label>
              <select
                id="category"
                name="category"
                className="form-control"
                value={form.category}
                onChange={handleChange}
                required
              >
                <option value="">— Select a category —</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {form.category === 'ICT Equipment' && (
                <p className="form-hint" style={{ color: '#2563eb', marginTop: '0.4rem' }}>
                  ICT Equipment requests require ICT Manager approval before Procurement.
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="title">Title / Description of Purpose <span className="required">*</span></label>
              <input
                id="title"
                name="title"
                type="text"
                className="form-control"
                value={form.title}
                onChange={handleChange}
                placeholder="Brief description of what is being procured"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="description">Full Justification / Scope of Work</label>
              <textarea
                id="description"
                name="description"
                className="form-control"
                value={form.description}
                onChange={handleChange}
                rows={4}
                placeholder="Detailed justification, technical specs, or scope of work"
              />
            </div>
          </fieldset>

          {/* ── Section 3: Supplier Details ── */}
          <fieldset className="form-section" style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
            <legend style={{ fontWeight: 600, fontSize: '0.875rem', color: '#475569', padding: '0 0.5rem' }}>Supplier</legend>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="supplier_name">Supplier Name</label>
                <input
                  id="supplier_name"
                  name="supplier_name"
                  type="text"
                  className="form-control"
                  value={form.supplier_name}
                  onChange={handleChange}
                  placeholder="Name of supplier"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="quote_number">Invoice / Quote Number</label>
                <input
                  id="quote_number"
                  name="quote_number"
                  type="text"
                  className="form-control"
                  value={form.quote_number}
                  onChange={handleChange}
                  placeholder="e.g. INV-2026-001"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="amount">Total Amount (VUV)</label>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  className="form-control"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  step="1"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="quote_file">Attach Quote / Document</label>
                <input
                  id="quote_file"
                  name="quote_file"
                  type="file"
                  className="form-control"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  onChange={(e) => setFile(e.target.files[0] || null)}
                />
                <p className="form-hint">PDF, Word, Excel, or image. Max 10 MB.</p>
              </div>
            </div>
          </fieldset>

          {/* ── Submit options ── */}
          <div className="form-group form-check-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={submitNow}
                onChange={(e) => setSubmitNow(e.target.checked)}
              />
              Submit for approval immediately
            </label>
            <p className="form-hint">Leave unchecked to save as a draft first.</p>
          </div>

          <div className="form-actions">
            <Button type="submit" variant="primary" loading={loading} loadingText="Saving...">
              {submitNow ? 'Save & Submit' : 'Save as Draft'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/requests')}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
