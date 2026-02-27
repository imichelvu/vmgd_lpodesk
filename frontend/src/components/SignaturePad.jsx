import React, { useRef, useEffect, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import Button from './Button';

export default function SignaturePad({ width = 400, height = 150, onSave, savedData, className = '' }) {
  const ref = useRef(null);
  const boxRef = useRef(null);
  const lastAppliedRef = useRef({ data: null, canvasWidth: null });
  const [canvasWidth, setCanvasWidth] = useState(width);

  // Keep canvas responsive so it never overflows its container.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    const update = () => {
      const w = Math.floor(el.clientWidth || 0);
      if (w > 0) setCanvasWidth(w);
    };

    update();

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => update());
      ro.observe(el);
    } else {
      window.addEventListener('resize', update);
    }

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', update);
    };
  }, [width]);

  useEffect(() => {
    if (!savedData || !ref.current) {
      if (!savedData) lastAppliedRef.current = { data: null, canvasWidth: null };
      return;
    }
    const last = lastAppliedRef.current;
    if (last.data === savedData && last.canvasWidth === canvasWidth) return;
    lastAppliedRef.current = { data: savedData, canvasWidth };
    ref.current.clear();
    ref.current.fromDataURL(savedData);
  }, [savedData, canvasWidth]);

  const clear = () => {
    lastAppliedRef.current = { data: null, canvasWidth: null };
    ref.current?.clear();
  };
  const save = () => {
    if (ref.current?.isEmpty()) return null;
    const data = ref.current?.toDataURL('image/png');
    onSave?.(data);
    if (ref.current) {
      lastAppliedRef.current = { data, canvasWidth };
      ref.current.clear();
      ref.current.fromDataURL(data);
    }
    return data;
  };

  return (
    <div className={`signature-pad-wrapper ${className}`.trim()}>
      <div ref={boxRef} className="signature-pad" style={{ width: '100%', maxWidth: width, height }}>
        <SignatureCanvas
          ref={ref}
          canvasProps={{
            width: canvasWidth || width,
            height,
            style: { width: '100%', height: '100%' },
            className: 'signature-canvas',
          }}
          backgroundColor="rgba(0,0,0,0)"
          penColor="black"
        />
      </div>
      <div className="signature-pad-actions">
        <Button type="button" variant="secondary" onClick={clear}>Clear</Button>
        <Button type="button" variant="primary" onClick={save}>Save signature</Button>
      </div>
    </div>
  );
}
