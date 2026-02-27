import React from 'react';
import Form49Overlay from './Form49Overlay';

/**
 * PSC Form 4-9 preview – form image + overlay text (matches overlay.html positions).
 * Tweak --top-offset and positions in Form49Overlay.css / styles modules.
 */
export default function Form49Preview({ user, formData }) {
  return (
    <div className="form49-preview">
      <Form49Overlay user={user} formData={formData} />
    </div>
  );
}
