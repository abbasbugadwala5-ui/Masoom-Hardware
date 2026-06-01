'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { Customer, Supplier, Warehouse } from './erp-api';

/** All active customers for a picker (single page, large size). */
export function useCustomers() {
  return useQuery({
    queryKey: ['customers-all'],
    queryFn: async () => (await api.get<{ data: Customer[] }>('/customers?pageSize=200')).data.data,
  });
}

/** All active suppliers for a picker. */
export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers-all'],
    queryFn: async () => (await api.get<{ data: Supplier[] }>('/suppliers?pageSize=200')).data.data,
  });
}

/** All active warehouses for a picker. */
export function useWarehouses() {
  return useQuery({
    queryKey: ['warehouses-all'],
    queryFn: async () => (await api.get<{ data: Warehouse[] }>('/warehouses')).data.data,
  });
}

/** Pull a human-readable message out of an axios error. */
export function apiErrorMessage(err: unknown, fallback = 'Request failed'): string {
  return (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ?? fallback;
}
