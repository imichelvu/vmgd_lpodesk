/**
 * Author: Igor Michel
 * Purpose: Render a slim, stylized top banner with logo and app title.
 * Last updated: 2026-02-09
 */
import React from 'react';

export default function TopBanner({ title }) {
  return (
    <div className="top-banner-wrap" aria-label="Application title banner">
      <div className="top-banner-body">
        <div className="top-banner-single-bar">
          <span className="top-banner-single-title">{title || 'APP TITLE'}</span>
        </div>
      </div>
    </div>
  );
}

