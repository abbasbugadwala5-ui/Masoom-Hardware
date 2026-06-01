'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Package, Users, ShoppingCart, FileText,
  Truck, Warehouse, Receipt, BarChart3, LogOut, Bell, Search,
  Cog, FileSpreadsheet, Building2, UserCog, Percent, FileSignature,
  ClipboardList, Undo2, HandCoins, PackagePlus,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-store';
import { Logo } from '@/components/site/Logo';

const NAV: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; perm?: string; section?: string }[] = [
  { href: '/erp',                 label: 'Dashboard',      icon: LayoutDashboard },

  { section: 'Sales', href: '/erp/quotations',     label: 'Quotations',     icon: FileSignature,   perm: 'quotation.read' },
  { href: '/erp/sales-orders',  label: 'Sales Orders',   icon: ClipboardList,   perm: 'salesorder.read' },
  { href: '/erp/sales',         label: 'Tax Invoices',   icon: FileText,        perm: 'invoice.read' },
  { href: '/erp/deliveries',    label: 'Delivery Orders',icon: Truck,           perm: 'delivery.read' },
  { href: '/erp/credit-notes',  label: 'Credit Notes',   icon: Undo2,           perm: 'creditnote.read' },
  { href: '/erp/receipts',      label: 'Receipts',       icon: HandCoins,       perm: 'payment.read' },

  { section: 'Purchases', href: '/erp/purchases',  label: 'LPO (Orders)',   icon: ShoppingCart,    perm: 'lpo.read' },
  { href: '/erp/grns',          label: 'Goods Received', icon: PackagePlus,     perm: 'grn.read' },
  { href: '/erp/purchase-invoices', label: 'Purchase Invoices', icon: FileText, perm: 'purchaseinvoice.read' },
  { href: '/erp/debit-notes',   label: 'Debit Notes',    icon: Undo2,           perm: 'debitnote.read' },
  { href: '/erp/payments',      label: 'Supplier Payments', icon: HandCoins,    perm: 'payment.pay' },

  { section: 'Master', href: '/erp/products',      label: 'Products',       icon: Package,         perm: 'product.read' },
  { href: '/erp/inventory',     label: 'Inventory',      icon: Warehouse,       perm: 'inventory.read' },
  { href: '/erp/customers',     label: 'Customers',      icon: Users,           perm: 'customer.read' },
  { href: '/erp/suppliers',     label: 'Suppliers',      icon: Building2,       perm: 'supplier.read' },

  { section: 'Finance', href: '/erp/accounts',     label: 'Accounts',       icon: Receipt,         perm: 'accounts.read' },
  { href: '/erp/reports',       label: 'Reports',        icon: BarChart3,       perm: 'reports.read' },
  { href: '/erp/vat',           label: 'VAT',            icon: Percent,         perm: 'reports.read' },

  { section: 'Admin', href: '/erp/settings',       label: 'Settings',       icon: Cog,             perm: 'settings.manage' },
  { href: '/erp/users',         label: 'Users & Roles',  icon: UserCog,         perm: 'user.read' },
];

export default function ErpLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout, can } = useAuth();
  const [q, setQ] = useState('');

  const isLoginPage = pathname === '/erp/login';

  useEffect(() => {
    if (!loading && !user && !isLoginPage) router.replace('/erp/login');
  }, [loading, user, isLoginPage, router]);

  if (isLoginPage) return <>{children}</>;
  if (loading || !user) return null;

  return (
    <div className="grid min-h-screen grid-cols-[260px_1fr] bg-ink-50 text-ink-900">
      {/* SIDEBAR */}
      <aside className="flex h-screen flex-col bg-ink-950 text-ink-200">
        <div className="flex h-16 items-center border-b border-ink-800 px-5">
          <Logo variant="light" size="sm" />
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          {NAV.filter((n) => !n.perm || can(n.perm)).map((n) => {
            const active =
              n.href === '/erp'
                ? pathname === '/erp'
                : pathname === n.href || pathname.startsWith(`${n.href}/`);
            return (
              <div key={n.href}>
                {n.section && (
                  <div className="mb-1 mt-4 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-ink-500">
                    {n.section}
                  </div>
                )}
                <Link
                  href={n.href}
                  className={`mb-1 flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? 'bg-brand-500 text-ink-950'
                      : 'text-ink-300 hover:bg-ink-900 hover:text-white'
                  }`}
                >
                  <n.icon className="h-4 w-4" /> {n.label}
                </Link>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-ink-800 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-500 font-display text-sm font-bold text-ink-950">
              {user.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">{user.fullName}</div>
              <div className="text-[11px] uppercase tracking-widest text-brand-500">{user.role.replace('_', ' ')}</div>
            </div>
            <button
              onClick={() => { void logout().then(() => router.replace('/erp/login')); }}
              aria-label="Sign out"
              className="grid h-8 w-8 place-items-center rounded-sm text-ink-300 hover:bg-ink-900 hover:text-brand-500"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex h-screen flex-col overflow-hidden">
        {/* TOPBAR */}
        <header className="flex h-16 items-center justify-between gap-4 border-b border-ink-100 bg-white px-6">
          <form
            onSubmit={(e) => { e.preventDefault(); }}
            className="flex max-w-md flex-1 items-center rounded-sm border border-ink-200 focus-within:border-brand-500"
          >
            <Search className="ml-3 h-4 w-4 text-ink-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search anything…"
              className="flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-ink-400"
            />
            <button className="grid h-9 w-10 place-items-center bg-brand-500 text-ink-950 hover:bg-brand-400">
              <Search className="h-4 w-4" />
            </button>
          </form>

          <div className="flex items-center gap-2">
            <button aria-label="Notifications" className="relative grid h-9 w-9 place-items-center rounded-sm border border-ink-200 text-ink-700 hover:border-brand-500 hover:text-brand-600">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-500" />
            </button>
            <div className="hidden items-center gap-2 rounded-sm border border-ink-200 px-3 py-1.5 md:flex">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-ink-950 font-display text-xs font-bold text-brand-500">
                {user.fullName.slice(0, 2).toUpperCase()}
              </div>
              <div className="leading-tight">
                <div className="text-xs font-bold text-ink-900">{user.fullName.split(' ').slice(0,2).join(' ')}</div>
                <div className="text-[10px] uppercase tracking-widest text-ink-500">{user.role.replace('_', ' ')}</div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
