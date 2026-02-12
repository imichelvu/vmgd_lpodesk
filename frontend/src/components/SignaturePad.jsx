import React, { useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';

export default function SignaturePad({ width = 400, height = 150, onSave, savedData }) {
  const ref = useRef(null);

  useEffect(() => {
    if (savedData && ref.current) {
      ref.current.fromDataURL(savedData);
    }
  }, [savedData]);

  const clear = () => ref.current?.clear();
  const save = () => {
    if (ref.current?.isEmpty()) return null;
    const data = ref.current?.toDataURL('image/png');
    onSave?.(data);
    return data;
  };

  return (
    <div className="form-group">
      <div className="signature-pad" style={{ width, height }}>
        <SignatureCanvas
          ref={ref}
          canvasProps={{
            width,
            height,
            style: { width: '100%', height: '100%' },
            className: 'signature-canvas',
          }}
          backgroundColor="white"
          penColor="black"
        />
      </div>
      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
        <button type="button" className="btn btn-secondary" onClick={clear}>
          Clear
        </button>
        <button type="button" className="btn btn-primary" onClick={save}>
          Save signature
        </button>
      </div>
    </div>
  );
}
