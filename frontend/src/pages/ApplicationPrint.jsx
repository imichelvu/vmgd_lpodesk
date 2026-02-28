import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_IDS } from '../context/AuthContext';
import Form49Preview from '../components/Form49Preview';
import Button from '../components/Button';
import PageHeader from '../components/PageHeader';

export default function ApplicationPrint() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, api, hasRole } = useAuth();
  const [app, setApp] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api(`/leave/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setApp(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Failed to load application.');
      });
    return () => { cancelled = true; };
  }, [id, api]);

  useEffect(() => {
    const base = (import.meta.env.VITE_APP_NAME ?? '').trim();
    document.title = base ? `Printable Form #${id} · ${base}` : `Printable Form #${id}`;
  }, [id]);

  const applicantProfile = useMemo(() => {
    if (!app) return null;
    return {
      full_name: app.applicant_name || '',
      vnpf_no: app.vnpf_no || '',
      post_title: app.post_title || '',
      post_no: app.post_no || '',
      grade: app.grade || '',
      department: app.department || '',
      ministry: app.ministry || '',
      entry_date: app.entry_date || '',
    };
  }, [app]);

  if (error) {
    return (
      <div className="card">
        <p className="text-muted">{error}</p>
      </div>
    );
  }

  if (!app) return <div>Loading printable form...</div>;

  const isApplicant = Number(user?.id) === Number(app.applicant_id);
  const canBypass = hasRole?.(ROLE_IDS.Admin);
  const canView = isApplicant || canBypass;

  if (!canView) {
    return (
      <div className="card">
        <p className="text-muted">This printable form is available only to the applicant after final approval.</p>
        <Button type="button" variant="secondary" onClick={() => navigate(`/application/${id}`)}>
          Back to application
        </Button>
      </div>
    );
  }

  const isFullyApproved = app.status === 'Approved';

  return (
    <div className="print-page">
      <div className="print-form-actions">
        <PageHeader
          title={`Printable PSC Form 4-9 #${app.id}`}
          subtitle={isFullyApproved ? 'Full copy with all available signatures and details.' : 'This form is printable after final approval.'}
          actions={(
            <>
              <Button type="button" variant="primary" onClick={() => window.print()} disabled={!isFullyApproved}>
                Print form
              </Button>
              <Link className="btn btn-secondary" to={`/application/${id}`}>Back</Link>
            </>
          )}
        />
      </div>

      {isFullyApproved ? (
        <div className="print-page-content">
          <div className="print-fit-frame">
            <Form49Preview user={applicantProfile} formData={app} />
          </div>
        </div>
      ) : (
        <div className="card">
          <p className="text-muted">This application is currently "{app.status}" and will become printable once status is "Approved".</p>
        </div>
      )}
    </div>
  );
}

