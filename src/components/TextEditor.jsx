import React, { useEffect, useRef } from 'react';

export default function TextEditor({ element, panOffset, scale, onCommit, onCancel }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, []);

  if (!element) return null;

  const left = element.x1 * scale + panOffset.x;
  const top  = element.y1 * scale + panOffset.y;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onCommit(ref.current.value);
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <textarea
      ref={ref}
      defaultValue={element.text || ''}
      onKeyDown={handleKeyDown}
      onBlur={() => onCommit(ref.current.value)}
      style={{
        position: 'fixed',
        left,
        top,
        minWidth: 100,
        minHeight: 40,
        fontSize: (element.fontSize || 20) * scale,
        fontFamily: `'${element.fontFamily || 'Caveat'}', cursive`,
        color: element.color || '#000',
        textAlign: element.textAlign || 'left',
        background: 'transparent',
        border: '1.5px dashed #3b82f6',
        outline: 'none',
        resize: 'none',
        overflow: 'hidden',
        padding: '2px 4px',
        zIndex: 1000,
        lineHeight: 1.3,
      }}
      rows={1}
    />
  );
}
