'use client';

import { useParams } from 'next/navigation';
import { useOne, type Customer } from '@/lib/erp-api';
import { CustomerForm } from '../customer-form';
import { Spinner } from '@/components/erp/ErpPage';

export default function EditCustomerPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, error } = useOne<Customer>('customers', params.id);
  if (isLoading) return <div className="grid h-64 place-items-center"><Spinner size="md" /></div>;
  if (error || !data) return <div className="p-8 text-sm text-red-600">Customer not found.</div>;
  return <CustomerForm customer={data} />;
}
