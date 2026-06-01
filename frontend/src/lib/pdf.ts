'use client';

import { api } from './api';

/**
 * Fetch a server-generated document PDF (with the auth header axios attaches),
 * then open it in a new tab or trigger a download. The PDF endpoints require a
 * Bearer token, so we can't just point an <a href> at them.
 */
export async function openPdf(resource: string, id: string, opts: { download?: boolean } = {}) {
  const res = await api.get<Blob>(`/${resource}/${id}/pdf`, { responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  if (opts.download) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `${resource}-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } else {
    window.open(url, '_blank', 'noopener');
  }
  // Revoke a little later so the new tab has time to load.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
