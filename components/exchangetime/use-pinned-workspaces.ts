'use client';

import { useEffect, useState } from 'react';

import { workspaces } from './product-model';

const key = 'et.workspace-pins.v1';
const defaults = ['StockAnalysis', 'MarketScreener', 'DCFCalculator', 'FinancialGoals'];

function readPins(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (Array.isArray(saved)) return [...new Set(saved.filter((id): id is string => workspaces.some(item => item.key === id)))];
  } catch {}
  return defaults;
}

export function usePinnedWorkspaces() {
  const [pins, setPins] = useState(defaults);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const refresh = () => setPins(readPins());
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('et-pins', refresh);
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('et-pins', refresh); };
  }, []);
  function toggle(id: string) {
    const current = readPins();
    const next = current.includes(id) ? current.filter(item => item !== id) : [...current, id];
    try {
      localStorage.setItem(key, JSON.stringify(next));
      window.dispatchEvent(new Event('et-pins'));
      setNotice('');
    } catch { setNotice('Pins could not be saved on this device.'); }
  }
  return { pins, toggle, notice };
}
