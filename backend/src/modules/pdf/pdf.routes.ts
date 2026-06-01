/**
 * Reusable `GET /:id/pdf` endpoint for any document module.
 * `?download=1` forces an attachment; otherwise the PDF renders inline in the browser.
 * `?refresh=1` regenerates even if a cached copy exists.
 */
import type { Router } from 'express';
import { requireAuth, requirePermission } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { getDocumentPdf, type DocKind } from './pdf.service';

export function attachPdfRoute(router: Router, kind: DocKind, readPermission: string): void {
  router.get(
    '/:id/pdf',
    requireAuth,
    requirePermission(readPermission),
    asyncHandler(async (req, res) => {
      const force = req.query.refresh === '1' || req.query.refresh === 'true';
      const { buffer, filename } = await getDocumentPdf(kind, req.params.id, force);
      const disposition = req.query.download ? 'attachment' : 'inline';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
      res.setHeader('Content-Length', String(buffer.length));
      res.end(buffer);
    }),
  );
}
