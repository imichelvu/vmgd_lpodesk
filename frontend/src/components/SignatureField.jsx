import React from 'react';
import SignaturePad from './SignaturePad';

export default function SignatureField({
  label = 'Signature',
  hint,
  required = false,
  width = 320,
  height = 120,
  value,
  onChange,
}) {
  const hasValue = typeof value === 'string' && value.startsWith('data:');

  return (
    <div className="form-group">
      {label && <h4 className="section-title section-title-sm" style={{ marginBottom: 8 }}>{label}{required ? ' *' : ''}</h4>}
      {hint && (
        <p className="card-subtitle" style={{ marginTop: -4, marginBottom: 8 }}>
          {hint}
        </p>
      )}
      <SignaturePad
        width={width}
        height={height}
        onSave={onChange}
        savedData={hasValue ? value : null}
      />
    </div>
  );
}

