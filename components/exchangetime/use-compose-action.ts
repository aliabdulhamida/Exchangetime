'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export function useComposeAction(workspace: string, open: () => void) {
  const requested = useSearchParams()?.get('compose');
  useEffect(() => {
    if (requested !== 'new') return;
    const url = new URL(location.href);
    if (url.searchParams.get('compose') !== 'new' || url.searchParams.get('view') !== workspace) return;
    url.searchParams.delete('compose');
    window.history.replaceState(null, '', url);
    open();
  }, [requested, workspace, open]);
}
