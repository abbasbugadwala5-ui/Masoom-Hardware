'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

interface Paginated<T> {
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

/* ── DASHBOARD ─────────────────────────────────────────────────────────── */

export interface DashboardKpis {
  users: number; customers: number; suppliers: number; products: number;
  warehouses: number; invoices: number; lowStock: number;
  totalSales: number; outstanding: number; totalOrders: number;
}

export function useKpis() {
  return useQuery({
    queryKey: ['kpis'],
    queryFn: async () => (await api.get<{ data: DashboardKpis }>('/dashboard/kpis')).data.data,
  });
}

export interface DashboardOverview {
  counts: { customers: number; suppliers: number; products: number; invoices: number; lpos: number; lowStock: number };
  sales:  { total: number; today: number; month: number; year: number; outstanding: number; avgInvoice: number };
  purchases: { total: number; month: number; year: number };
  vat:    { output: number; input: number; netPayable: number };
  profit: { gross: number; marginPct: number };
  monthly: { month: string; sales: number; purchases: number }[];
  topCustomers: { id: string; name: string; code: string; revenue: number; invoiceCount: number }[];
  topProducts:  { id: string; name: string; sku: string; quantity: number; revenue: number }[];
  recentInvoices: { id: string; number: string; date: string; status: string; total: number; customer: string }[];
  recentLpos:     { id: string; number: string; date: string; status: string; total: number; supplier: string }[];
}

export function useDashboardOverview() {
  return useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: async () => (await api.get<{ data: DashboardOverview }>('/dashboard/overview')).data.data,
    refetchInterval: 30_000,
  });
}

/* ── GENERIC LIST HOOK ─────────────────────────────────────────────────── */

interface ListParams {
  page?: number; pageSize?: number; q?: string;
  sort?: string; order?: 'asc' | 'desc';
  // optional server-side filters used by some resources
  direction?: string; customerId?: string; status?: string;
}

export function useList<T>(resource: string, params: ListParams = {}) {
  const search = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]));
  const qs = search.toString();
  return useQuery({
    queryKey: [resource, params],
    queryFn: async () => (await api.get<Paginated<T>>(`/${resource}${qs ? `?${qs}` : ''}`)).data,
    placeholderData: (prev) => prev,
  });
}

export function useOne<T>(resource: string, id: string | undefined) {
  return useQuery({
    queryKey: [resource, id],
    enabled: !!id,
    queryFn: async () => (await api.get<{ data: T }>(`/${resource}/${id}`)).data.data,
  });
}

export function useCreate<T extends object>(resource: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: T) => (await api.post<{ data: unknown }>(`/${resource}`, body)).data.data,
    onSuccess: () => { void qc.invalidateQueries({ queryKey: [resource] }); void qc.invalidateQueries({ queryKey: ['kpis'] }); },
  });
}

export function useUpdate<T extends object>(resource: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: T }) =>
      (await api.put<{ data: unknown }>(`/${resource}/${id}`, body)).data.data,
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: [resource] });
      void qc.invalidateQueries({ queryKey: [resource, vars.id] });
    },
  });
}

export function useDelete(resource: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => { await api.delete(`/${resource}/${id}`); },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: [resource] }); void qc.invalidateQueries({ queryKey: ['kpis'] }); },
  });
}

/* ── DOMAIN TYPES ──────────────────────────────────────────────────────── */

export interface Product {
  id: string; sku: string; barcode?: string | null; name: string;
  description?: string | null; unit: string;
  costPrice: string; sellingPrice: string; vatRate: string;
  reorderLevel: number; isActive: boolean;
  categoryId?: string | null; brandId?: string | null;
  category?: { id: string; name: string } | null;
  brand?:    { id: string; name: string } | null;
  createdAt: string;
}

export interface Customer {
  id: string; code: string; name: string; legalName?: string | null;
  trn?: string | null; email?: string | null; phone?: string | null;
  contactPerson?: string | null; addressLine1?: string | null; city?: string | null;
  creditLimit: string; creditDays: number; openingBalance: string;
  isActive: boolean; createdAt: string;
}

export interface Supplier {
  id: string; code: string; name: string; legalName?: string | null;
  trn?: string | null; email?: string | null; phone?: string | null;
  contactPerson?: string | null; addressLine1?: string | null; city?: string | null;
  creditDays: number; openingBalance: string;
  isActive: boolean; createdAt: string;
}

export interface UserRow {
  id: string; email: string; fullName: string; phone?: string | null;
  isActive: boolean; lastLoginAt?: string | null; createdAt: string;
  role: { id: string; name: string; description?: string | null };
}

export interface Role {
  id: string; name: string; description?: string | null;
  _count: { users: number; permissions: number };
}

export interface Category { id: string; name: string; slug: string }
export interface Brand    { id: string; name: string; slug: string; logoUrl?: string | null }

export interface PartyMini { id: string; code: string; name: string; legalName?: string | null; trn?: string | null; email?: string | null; phone?: string | null; addressLine1?: string | null; city?: string | null; country?: string | null }
export interface ProductMini { id: string; sku: string; name: string; unit: string }

export interface InvoiceItem {
  id: string; productId: string; description?: string | null; position: number;
  quantity: string; unitPrice: string; discount: string; vatRate: string;
  subtotal: string; vatAmount: string; total: string;
  product?: ProductMini;
}

export interface Invoice {
  id: string; number: string; status: 'DRAFT'|'POSTED'|'PAID'|'PART_PAID'|'CANCELLED';
  date: string; dueDate?: string | null;
  notes?: string | null; terms?: string | null;
  subtotal: string; discount: string; taxableAmount: string;
  vatAmount: string; total: string; amountPaid: string;
  vatBreakdown?: { rate: number; taxable: number; vat: number }[] | null;
  customerId: string; customer?: PartyMini;
  items?: InvoiceItem[];
  createdAt: string; postedAt?: string | null;
}

/* ── SALES DOCUMENTS (quotation / sales order / delivery / credit note) ──── */

export interface DocRef { id: string; number: string }

export interface PricedItem {
  id: string; productId: string; description?: string | null; position: number;
  quantity: string; unitPrice: string; discount?: string; vatRate: string;
  subtotal: string; vatAmount: string; total: string;
  product?: ProductMini;
}

export interface Quotation {
  id: string; number: string; status: 'DRAFT'|'SENT'|'ACCEPTED'|'REJECTED'|'EXPIRED';
  date: string; validUntil?: string | null; notes?: string | null; terms?: string | null;
  subtotal: string; discount: string; taxableAmount: string; vatAmount: string; total: string;
  vatBreakdown?: { rate: number; taxable: number; vat: number }[] | null;
  customerId: string; customer?: PartyMini;
  items?: PricedItem[]; salesOrder?: DocRef | null;
  createdAt: string;
}

export interface SalesOrder {
  id: string; number: string; status: 'DRAFT'|'CONFIRMED'|'INVOICED'|'CANCELLED';
  date: string; notes?: string | null;
  subtotal: string; discount: string; taxableAmount: string; vatAmount: string; total: string;
  vatBreakdown?: { rate: number; taxable: number; vat: number }[] | null;
  customerId: string; customer?: PartyMini;
  items?: PricedItem[]; quotation?: DocRef | null; invoice?: DocRef | null;
  createdAt: string;
}

export interface DeliveryItem {
  id: string; productId: string; description?: string | null; position: number;
  quantity: string; product?: ProductMini;
}

export interface DeliveryOrder {
  id: string; number: string; status: 'DRAFT'|'DISPATCHED'|'DELIVERED'|'CANCELLED';
  date: string; deliveryAddress?: string | null; driverName?: string | null; vehicleNo?: string | null;
  notes?: string | null;
  customerId: string; customer?: PartyMini;
  warehouseId: string; warehouse?: { id: string; code: string; name: string };
  invoiceId?: string | null; invoice?: DocRef | null;
  items?: DeliveryItem[];
  createdAt: string;
}

export interface CreditNote {
  id: string; number: string;
  date: string; reason?: string | null; notes?: string | null;
  subtotal: string; taxableAmount: string; vatAmount: string; total: string;
  vatBreakdown?: { rate: number; taxable: number; vat: number }[] | null;
  customerId: string; customer?: PartyMini;
  invoiceId: string; invoice?: DocRef | null;
  items?: (PricedItem & { restoreStock?: boolean })[];
  createdAt: string;
}

export interface PaymentAllocation {
  id: string; amount: string;
  invoice?: { id: string; number: string; total: string; amountPaid: string } | null;
  purchaseInvoice?: { id: string; number: string; total: string; amountPaid: string } | null;
}

export interface Payment {
  id: string; number: string;
  direction: 'RECEIVED'|'PAID';
  method: 'CASH'|'BANK_TRANSFER'|'CHEQUE'|'CARD'|'ONLINE'|'OTHER';
  date: string; amount: string; reference?: string | null; notes?: string | null;
  customerId?: string | null; customer?: PartyMini | null;
  supplierId?: string | null; supplier?: PartyMini | null;
  allocations?: PaymentAllocation[];
  createdAt: string;
}

export interface Warehouse { id: string; code: string; name: string }

export interface LpoItem {
  id: string; productId: string; description?: string | null; position: number;
  quantity: string; unitPrice: string; vatRate: string;
  subtotal: string; vatAmount: string; total: string;
  product?: ProductMini;
}

export interface Lpo {
  id: string; number: string; status: 'DRAFT'|'SENT'|'RECEIVED'|'CANCELLED';
  date: string; notes?: string | null;
  subtotal: string; vatAmount: string; total: string;
  supplierId: string; supplier?: PartyMini;
  items?: LpoItem[];
  createdAt: string;
}

/* ── PURCHASE DOCUMENTS ─────────────────────────────────────────────────── */

export interface CostItem {
  id: string; productId: string; description?: string | null; position?: number;
  quantity: string; unitCost: string; vatRate?: string;
  subtotal?: string; vatAmount?: string; total: string;
  product?: ProductMini;
}

export interface PurchaseInvoice {
  id: string; number: string; supplierInvoiceNo?: string | null;
  status: 'DRAFT'|'POSTED'|'PAID'|'PART_PAID'|'CANCELLED';
  date: string; dueDate?: string | null; notes?: string | null;
  subtotal: string; vatAmount: string; total: string; amountPaid: string;
  vatBreakdown?: { rate: number; taxable: number; vat: number }[] | null;
  supplierId: string; supplier?: PartyMini;
  items?: CostItem[];
  createdAt: string;
}

export interface Grn {
  id: string; number: string; date: string; notes?: string | null;
  warehouseId: string; warehouse?: { id: string; code: string; name: string };
  lpoId?: string | null; lpo?: { id: string; number: string; supplier?: { id: string; name: string; code: string } } | null;
  items?: { id: string; productId: string; quantity: string; unitCost: string; product?: ProductMini }[];
  createdAt: string;
}

export interface DebitNote {
  id: string; number: string; date: string; reason?: string | null; total: string;
  supplierId: string; supplier?: PartyMini;
  purchaseInvoiceId: string; purchaseInvoice?: DocRef | null;
  items?: { id: string; productId: string; quantity: string; unitCost: string; total: string; product?: ProductMini }[];
  createdAt: string;
}

/* ── INVENTORY / REPORTS / SETTINGS ─────────────────────────────────────── */

export interface StockRow {
  id: string; sku: string; name: string; unit: string;
  reorderLevel: number; costPrice: string; onHand: number; low: boolean;
  byWarehouse: { warehouseId: string; warehouse: string; quantity: number }[];
}

export interface Expense {
  id: string; number: string; date: string; category: string;
  description?: string | null; amount: string; vatAmount: string; total: string;
  paidVia?: string | null;
}

export interface CompanySettings {
  id: string; legalName: string; tradeName?: string | null; trn: string;
  email?: string | null; phone?: string | null;
  addressLine1?: string | null; addressLine2?: string | null; city?: string | null; country: string;
  defaultVatRate: string; invoiceFooter?: string | null;
}
