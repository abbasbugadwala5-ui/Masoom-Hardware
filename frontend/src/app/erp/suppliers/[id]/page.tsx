'use client';

import { useParams } from 'next/navigation';
import { useOne, type Supplier } from '@/lib/erp-api';
import { SupplierForm } from '../supplier-form';
import { Spinner } from '@/components/erp/ErpPage';

export default function EditSupplierPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, error } = useOne<Supplier>('suppliers', params.id);
  if (isLoading) return <div className="grid h-64 place-items-center"><Spinner size="md" /></div>;
  if (error || !data) return <div className="p-8 text-sm text-red-600">Supplier not found.</div>;
  return <SupplierForm supplier={data} />;
}
