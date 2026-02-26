import React, { useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';

export default function SignaturePad({ width = 400, height = 150, onSave, savedData }) {
  const ref = useRef(null);
  const lastDrawnRef = useRef(null);

  useEffect(() => {
    if (!savedData || !ref.current) {
      if (!savedData) lastDrawnRef.current = null;
      return;
    }
    if (lastDrawnRef.current === savedData) return;
    lastDrawnRef.current = savedData;
    ref.current.clear();
    ref.current.fromDataURL(savedData);
  }, [savedData]);

  const clear = () => {
    lastDrawnRef.current = null;
    ref.current?.clear();
  };
  const save = () => {
    if (ref.current?.isEmpty()) return null;
    const data = ref.current?.toDataURL('image/png');
    onSave?.(data);
    if (ref.current) {
      lastDrawnRef.current = data;
      ref.current.clear();
      ref.current.fromDataURL(data);
    }
    return data;
  };

  return (
    <div className="form-group signature-pad-wrapper">
      <div className="signature-pad" style={{ width, height }}>
        <SignatureCanvas
          ref={ref}
          canvasProps={{
            width,
            height,
            style: { width: '100%', height: '100%' },
            className: 'signature-canvas',
          }}
          backgroundColor="rgba(0,0,0,0)"
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
