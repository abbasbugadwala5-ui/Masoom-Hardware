'use client';
import { ComingSoon } from '@/components/erp/ComingSoon';
export default function DocumentsPage() {
  return <ComingSoon module="Documents" phase="Phase 3" points={[
    'Searchable PDF archive (invoices, quotations, DOs, LPOs)',
    'Filter by customer, date range, status',
    'Re-download or email any past document',
    'Bulk export to ZIP',
    'Document history & version tracking',
  ]} />;
}
