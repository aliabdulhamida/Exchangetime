'use client';

import { Delete, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { editNumberEntry, normalizeNumberEntry, validateNumberEntry } from '@/lib/number-entry';

function isNumeric(field: HTMLInputElement) {
  return (
    field.type === 'number' ||
    ['decimal', 'numeric'].includes(field.inputMode) ||
    field.dataset.numericKeypad === 'true'
  );
}
function readValue(field: HTMLInputElement) {
  return normalizeNumberEntry(field.value, field.dataset.numberFormat === 'grouped');
}

export default function NumericKeypad() {
  const [field, setField] = useState<HTMLInputElement | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const panel = useRef<HTMLDivElement>(null);
  const replacing = useRef(true);
  const activeEntry = useRef({ field, draft });
  activeEntry.current = { field, draft };
  useEffect(() => {
    function prepare(event: Event) {
      if (!window.matchMedia('(pointer: coarse)').matches) return;
      const target = event.target;
      if (
        !(target instanceof HTMLInputElement) ||
        !isNumeric(target) ||
        target.disabled ||
        target.readOnly
      )
        return;
      target.dataset.numericKeypad = 'true';
      target.inputMode = 'none';
    }
    function open(event: FocusEvent) {
      if (!window.matchMedia('(pointer: coarse)').matches) return;
      const entry = activeEntry.current;
      if (event.target === entry.field || panel.current?.contains(event.target as Node)) return;
      if (entry.field?.isConnected && entry.draft !== readValue(entry.field)) {
        setError('Unsaved value. Choose Done, Next or Cancel.');
        entry.field.focus({ preventScroll: true });
        return;
      }
      prepare(event);
      const target = event.target;
      if (
        target instanceof HTMLInputElement &&
        target.dataset.numericKeypad === 'true' &&
        !target.disabled &&
        !target.readOnly
      ) {
        setDraft(readValue(target));
        setError('');
        replacing.current = true;
        setField(target);
        requestAnimationFrame(() =>
          (target.closest('label') || target).scrollIntoView({
            block: 'start',
            behavior: 'smooth',
          }),
        );
      } else if (!(target instanceof Node) || !panel.current?.contains(target)) {
        setField(null);
      }
    }
    function close(event: Event) {
      const entry = activeEntry.current;
      if (panel.current?.contains(event.target as Node) || event.target === entry.field) return;
      if (entry.field && entry.draft !== readValue(entry.field)) {
        event.preventDefault();
        event.stopPropagation();
        setError('Unsaved value. Choose Done, Next or Cancel.');
        return;
      }
      entry.field?.blur();
      setField(null);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        activeEntry.current.field?.blur();
        setField(null);
      }
    }
    function sync(event: Event) {
      if (event.target instanceof HTMLInputElement && event.target.dataset.numericKeypad === 'true')
        setDraft(readValue(event.target));
    }
    document.addEventListener('pointerdown', prepare, true);
    document.addEventListener('focusin', open);
    document.addEventListener('pointerdown', close, true);
    document.addEventListener('click', close, true);
    document.addEventListener('keydown', escape);
    document.addEventListener('input', sync);
    return () => {
      document.removeEventListener('pointerdown', prepare, true);
      document.removeEventListener('focusin', open);
      document.removeEventListener('pointerdown', close, true);
      document.removeEventListener('click', close, true);
      document.removeEventListener('keydown', escape);
      document.removeEventListener('input', sync);
    };
  }, []);
  useEffect(() => {
    if (field) document.documentElement.dataset.numberEntry = 'open';
    else delete document.documentElement.dataset.numberEntry;
    return () => {
      delete document.documentElement.dataset.numberEntry;
    };
  }, [field]);
  if (!field || !field.isConnected) return null;
  const label =
    field.labels?.[0]?.textContent?.trim() ||
    field.getAttribute('aria-label') ||
    field.placeholder ||
    'Enter value';
  function commit(next = false) {
    if (!field) return;
    const value = draft.replace(',', '.');
    const invalid = validateNumberEntry(value, field.min, field.max, field.required);
    if (invalid) {
      setError(invalid);
      return;
    }
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(field, value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.blur();
    setField(null);
    if (next) {
      const inputs = Array.from((field.form || document).querySelectorAll('input')).filter(
        (input) =>
          isNumeric(input) && !input.disabled && !input.readOnly && input.getClientRects().length,
      );
      const following = inputs[inputs.indexOf(field) + 1];
      following?.focus({ preventScroll: true });
    }
  }
  return createPortal(
    <div
      ref={panel}
      className="numeric-keypad"
      role="group"
      aria-label="Number keypad"
      onPointerDown={(event) => event.preventDefault()}
    >
      <header>
        <span>{label}</span>
        <button
          type="button"
          aria-label="Cancel number entry"
          onClick={() => {
            field.blur();
            setField(null);
          }}
        >
          <X size={18} />
        </button>
      </header>
      <output aria-live="polite">{draft || '0'}</output>
      {error && <p role="alert">{error}</p>}
      <div className="numeric-keypad-keys">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'delete'].map((key) => (
          <button
            type="button"
            key={key}
            aria-label={key === 'delete' ? 'Delete digit' : key === '.' ? 'Decimal point' : key}
            onClick={() => {
              setError('');
              const replace = replacing.current;
              setDraft((value) => editNumberEntry(value, key, replace));
              replacing.current = false;
            }}
          >
            {key === 'delete' ? <Delete size={22} /> : key}
          </button>
        ))}
      </div>
      <footer>
        <button
          type="button"
          onClick={() => {
            replacing.current = false;
            setDraft((value) => editNumberEntry(value, 'sign'));
          }}
        >
          +/−
        </button>
        <button
          type="button"
          onClick={() => {
            replacing.current = false;
            setDraft('');
          }}
        >
          Clear
        </button>
        <button type="button" onClick={() => commit(true)}>
          Next
        </button>
        <button type="button" className="keypad-done" onClick={() => commit()}>
          Done
        </button>
      </footer>
    </div>,
    field.closest('[role="dialog"]') || document.body,
  );
}
