import React from 'react';

function getAppName() {
  return (import.meta.env.VITE_APP_NAME ?? '').trim();
}

export default function AuthCardLayout({
  title,
  subtitle,
  showLogo = true,
  children,
}) {
  return (
    <div className="login-page">
      <div className="card login-card">
        <div className="login-card-header">
          {showLogo ? (
            <div className="login-logo-wrap">
              <img src="/vmgd-logo.png" alt="VMGD logo" className="login-logo" />
            </div>
          ) : null}
          <h1 className="login-title">{title || getAppName()}</h1>
          {subtitle ? <p className="login-subtitle">{subtitle}</p> : null}
        </div>
        {children}
      </div>
    </div>
  );
}
