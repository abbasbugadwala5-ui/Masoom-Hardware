'use client';

import { useParams } from 'next/navigation';
import { useOne, type Product } from '@/lib/erp-api';
import { ProductForm } from '../product-form';
import { Spinner } from '@/components/erp/ErpPage';

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const { data: product, isLoading, error } = useOne<Product>('products', params.id);

  if (isLoading) {
    return <div className="grid h-64 place-items-center"><Spinner size="md" /></div>;
  }
  if (error || !product) {
    return <div className="p-8 text-sm text-red-600">Product not found.</div>;
  }
  return <ProductForm product={product} />;
}
