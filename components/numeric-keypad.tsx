'use client';

import { Delete, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function isNumeric(field: HTMLInputElement) {
  return field.type === 'number' || ['decimal', 'numeric'].includes(field.inputMode) || field.dataset.numericKeypad === 'true';
}

export default function NumericKeypad() {
  const [field, setField] = useState<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function prepare(event: Event) {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !isNumeric(target) || target.disabled || target.readOnly) return;
      target.dataset.numericKeypad = 'true';
      target.inputMode = 'none';
    }
    function open(event: FocusEvent) {
      prepare(event);
      const target = event.target;
      if (target instanceof HTMLInputElement && target.dataset.numericKeypad === 'true' && !target.disabled && !target.readOnly) {
        setDraft(target.value);
        setError('');
        setField(target);
      } else if (!(target instanceof Node) || !panel.current?.contains(target)) {
        setField(null);
      }
    }
    function close(event: PointerEvent) {
      if (panel.current?.contains(event.target as Node) || event.target instanceof HTMLInputElement) return;
      setField(null);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') setField(null);
    }
    function sync(event: Event) {
      if (event.target instanceof HTMLInputElement && event.target.dataset.numericKeypad === 'true') setDraft(event.target.value);
    }
    document.addEventListener('pointerdown', prepare, true);
    document.addEventListener('focusin', open);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    document.addEventListener('input', sync);
    return () => {
      document.removeEventListener('pointerdown', prepare, true);
      document.removeEventListener('focusin', open);
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
      document.removeEventListener('input', sync);
    };
  }, []);
  if (!field || !field.isConnected) return null;
  const label = field.labels?.[0]?.textContent?.trim() || field.getAttribute('aria-label') || field.placeholder || 'Enter value';
  function commit() {
    if (!field) return;
    const value = draft.replace(',', '.');
    const numeric = Number(value);
    if (value && (!Number.isFinite(numeric) || value === '-' || value === '.')) {
      setError('Enter a valid number.');
      return;
    }
    if (value && ((field.min !== '' && numeric < Number(field.min)) || (field.max !== '' && numeric > Number(field.max)))) {
      setError(`Allowed range: ${field.min || '−∞'} to ${field.max || '∞'}.`);
      return;
    }
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.blur();
    setField(null);
  }
  return createPortal(
    <div ref={panel} className="numeric-keypad" role="group" aria-label="Number keypad" onPointerDown={event => event.preventDefault()}>
      <header><span>{label}</span><button type="button" aria-label="Cancel number entry" onClick={() => setField(null)}><X size={18} /></button></header>
      <output aria-live="polite">{draft || '0'}</output>
      {error && <p role="alert">{error}</p>}
      <div className="numeric-keypad-keys">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'delete'].map(key => (
          <button type="button" key={key} aria-label={key === 'delete' ? 'Delete digit' : key === '.' ? 'Decimal point' : key} onClick={() => { setError(''); setDraft(value => key === 'delete' ? value.slice(0, -1) : key === '.' && value.includes('.') ? value : value + key); }}>
            {key === 'delete' ? <Delete size={22} /> : key}
          </button>
        ))}
      </div>
      <footer><button type="button" onClick={() => setDraft(value => value.startsWith('-') ? value.slice(1) : '-' + value)}>+/−</button><button type="button" onClick={() => setDraft('')}>Clear</button><button type="button" className="keypad-done" onClick={commit}>Done</button></footer>
    </div>,
    field.closest('[role="dialog"]') || document.body,
  );
}
