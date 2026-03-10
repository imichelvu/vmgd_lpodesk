/**
 * Author: Igor Michel
 * Purpose: Full-page / inline content loader — animated green sinusoid wave.
 */
import React from 'react';

// SVG sinusoid path: one full period across 200px wide × 40px tall viewBox
const WAVE_PATH = 'M0,20 C16,0 34,0 50,20 C66,40 84,40 100,20 C116,0 134,0 150,20 C166,40 184,40 200,20';

export default function AppLoader({ message = 'Loading…', fullPage = true }) {
  return (
    <div className={`app-loader${fullPage ? ' app-loader-fullpage' : ''}`}>
      <div className="app-loader-content">
        <svg
          className="app-loader-wave"
          viewBox="0 0 200 40"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Glow layer */}
          <path
            d={WAVE_PATH}
            fill="none"
            stroke="#22c55e"
            strokeWidth="6"
            strokeLinecap="round"
            opacity="0.25"
          />
          {/* Bright travelling dot on the wave */}
          <path
            d={WAVE_PATH}
            fill="none"
            stroke="#16a34a"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="200"
            strokeDashoffset="200"
            className="app-loader-wave-line"
          />
          <circle r="4" fill="#22c55e" className="app-loader-wave-dot">
            <animateMotion
              dur="1.4s"
              repeatCount="indefinite"
              path={WAVE_PATH}
            />
          </circle>
        </svg>
        {message && <p className="app-loader-text">{message}</p>}
      </div>
    </div>
  );
}
