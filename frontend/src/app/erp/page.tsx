'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Wallet, AlertCircle, Package, ReceiptText,
  ShoppingCart, FilePlus, UserPlus, Truck, FileText, Building2, Calculator,
  Percent, ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-store';
import { useDashboardOverview } from '@/lib/erp-api';
import { Card, Spinner } from '@/components/erp/ErpPage';
import { aed, formatDate } from '@/lib/format';

const STATUS_TONE: Record<string, string> = {
  DRAFT:      'bg-ink-100 text-ink-700 ring-ink-200',
  POSTED:     'bg-brand-500/15 text-brand-700 ring-brand-500/30',
  PAID:       'bg-green-50 text-green-700 ring-green-200',
  PART_PAID:  'bg-amber-50 text-amber-700 ring-amber-200',
  SENT:       'bg-brand-500/15 text-brand-700 ring-brand-500/30',
  RECEIVED:   'bg-green-50 text-green-700 ring-green-200',
  CANCELLED:  'bg-red-50 text-red-700 ring-red-200',
};

export default function AccountingDashboardPage() {
  const user = useAuth((s) => s.user);
  const { data, isLoading } = useDashboardOverview();

  if (isLoading && !data) {
    return <div className="grid h-screen place-items-center"><Spinner size="md" /></div>;
  }

  const o = data!;

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Accounting overview</p>
          <h1 className="mt-1 font-display text-3xl tracking-tight text-ink-900 md:text-4xl">
            Welcome back, {user?.fullName.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-ink-500">Live data from your invoices, purchase orders and master records.</p>
        </div>
        <div className="rounded-sm border border-ink-100 bg-white px-3 py-2 text-xs text-ink-500 shadow-sm">
          {new Date().toLocaleDateString('en-AE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* PRIMARY KPIs */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Total Sales"
          value={aed.format(o.sales.total)}
          sub={`MTD ${aed.format(o.sales.month)}`}
          icon={<Wallet className="h-5 w-5" />}
          accent="yellow"
          href="/erp/sales"
        />
        <Kpi
          label="Total Purchases"
          value={aed.format(o.purchases.total)}
          sub={`MTD ${aed.format(o.purchases.month)}`}
          icon={<ShoppingCart className="h-5 w-5" />}
          href="/erp/purchases"
        />
        <Kpi
          label="Outstanding A/R"
          value={aed.format(o.sales.outstanding)}
          sub={o.sales.outstanding > 0 ? 'Unpaid invoices' : 'All clear'}
          icon={<AlertCircle className="h-5 w-5" />}
          accent={o.sales.outstanding > 0 ? 'red' : undefined}
        />
        <Kpi
          label="VAT Payable to FTA"
          value={aed.format(o.vat.netPayable)}
          sub={`Out ${aed.format(o.vat.output)} − In ${aed.format(o.vat.input)}`}
          icon={<Percent className="h-5 w-5" />}
          accent={o.vat.netPayable > 0 ? 'yellow' : undefined}
        />
      </div>

      {/* SECONDARY ROW */}
      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <Mini label="Today's sales"    value={aed.format(o.sales.today)} icon={<TrendingUp className="h-4 w-4" />} />
        <Mini label="Avg invoice"      value={aed.format(o.sales.avgInvoice)} icon={<ReceiptText className="h-4 w-4" />} />
        <Mini label="Gross profit"     value={aed.format(o.profit.gross)} sub={`${o.profit.marginPct.toFixed(1)}% margin`} icon={<Calculator className="h-4 w-4" />} tone={o.profit.gross < 0 ? 'red' : 'normal'} />
        <Mini label="Low-stock SKUs"   value={String(o.counts.lowStock)} sub="≤ 5 units" icon={<AlertCircle className="h-4 w-4" />} tone={o.counts.lowStock > 0 ? 'red' : 'normal'} />
      </div>

      {/* CHART + TOP CUSTOMERS */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <MonthlyChart data={o.monthly} />
        <TopCustomers rows={o.topCustomers} />
      </div>

      {/* TOP PRODUCTS + VAT SUMMARY */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <TopProducts rows={o.topProducts} />
        <VatSummary vat={o.vat} />
      </div>

      {/* RECENT INVOICES + RECENT LPOs */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <RecentList
          title="Recent Invoices"
          link="/erp/sales"
          rows={o.recentInvoices.map((r) => ({ id: r.id, number: r.number, name: r.customer, date: r.date, status: r.status, total: r.total, href: `/erp/sales/${r.id}` }))}
          emptyAction={{ label: 'Create invoice', href: '/erp/sales/new' }}
        />
        <RecentList
          title="Recent Purchase Orders"
          link="/erp/purchases"
          rows={o.recentLpos.map((r) => ({ id: r.id, number: r.number, name: r.supplier, date: r.date, status: r.status, total: r.total, href: `/erp/purchases/${r.id}` }))}
          emptyAction={{ label: 'Create LPO', href: '/erp/purchases/new' }}
        />
      </div>

      {/* QUICK ACTIONS */}
      <Card className="mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl tracking-tight text-ink-900">QUICK ACTIONS</h2>
          <span className="text-xs text-ink-500">Common accounting tasks</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <QuickAction icon={FilePlus}   label="Create Invoice"  href="/erp/sales/new" />
          <QuickAction icon={Truck}      label="Create LPO"      href="/erp/purchases/new" />
          <QuickAction icon={Package}    label="Add Product"     href="/erp/products/new" />
          <QuickAction icon={UserPlus}   label="Add Customer"    href="/erp/customers/new" />
          <QuickAction icon={Building2}  label="Add Supplier"    href="/erp/suppliers/new" />
          <QuickAction icon={FileText}   label="View Invoices"   href="/erp/sales" />
        </div>
      </Card>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

function Kpi({
  label, value, sub, icon, accent, href,
}: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode;
  accent?: 'yellow' | 'red';
  href?: string;
}) {
  const valueColor =
    accent === 'yellow' ? 'text-brand-600' :
    accent === 'red'    ? 'text-red-600'   :
    'text-ink-900';

  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="h-full rounded-sm border border-ink-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft"
    >
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-bold uppercase tracking-widest text-ink-500">{label}</div>
        <div className="grid h-9 w-9 place-items-center rounded-sm bg-brand-500/10 text-brand-600">{icon}</div>
      </div>
      <div className={`mt-3 font-display text-2xl tracking-tight ${valueColor}`}>{value}</div>
      {sub && <div className="mt-1 text-[11px] uppercase tracking-widest text-ink-400">{sub}</div>}
    </motion.div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function Mini({ label, value, sub, icon, tone = 'normal' }: { label: string; value: string; sub?: string; icon: React.ReactNode; tone?: 'normal' | 'red' }) {
  return (
    <div className="flex items-center gap-3 rounded-sm border border-ink-100 bg-white p-4 shadow-sm">
      <div className={`grid h-9 w-9 place-items-center rounded-sm ${tone === 'red' ? 'bg-red-50 text-red-600' : 'bg-ink-50 text-ink-700'}`}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-widest text-ink-500">{label}</div>
        <div className={`mt-0.5 font-display text-lg tracking-tight ${tone === 'red' ? 'text-red-600' : 'text-ink-900'}`}>{value}</div>
        {sub && <div className="text-[10px] uppercase tracking-widest text-ink-400">{sub}</div>}
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, href }: { icon: React.ComponentType<{ className?: string }>; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-sm border border-ink-100 bg-ink-50 px-4 py-3 text-left text-sm font-bold uppercase tracking-wider text-ink-700 transition hover:border-brand-500 hover:bg-brand-500 hover:text-ink-950"
    >
      <Icon className="h-4 w-4 text-brand-600 group-hover:text-ink-950" /> {label}
    </Link>
  );
}

function MonthlyChart({ data }: { data: { month: string; sales: number; purchases: number }[] }) {
  const W = 720, H = 240, P = 32;
  const max = Math.max(1, ...data.flatMap((d) => [d.sales, d.purchases]));
  const stepX = (W - P * 2) / Math.max(1, data.length - 1);

  const salesPts     = data.map((d, i) => [P + i * stepX, H - P - (d.sales     / max) * (H - P * 2)] as const);
  const purchasePts  = data.map((d, i) => [P + i * stepX, H - P - (d.purchases / max) * (H - P * 2)] as const);

  const toPath = (pts: readonly (readonly [number, number])[]) =>
    pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ');

  const salesArea = `${toPath(salesPts)} L ${salesPts[salesPts.length - 1]?.[0] ?? P} ${H - P} L ${salesPts[0]?.[0] ?? P} ${H - P} Z`;

  const fmtMonth = (m: string) => {
    const d = new Date(`${m}-01`);
    return d.toLocaleDateString('en-AE', { month: 'short' });
  };

  return (
    <Card className="p-5 lg:col-span-2">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl tracking-tight text-ink-900">SALES vs PURCHASES</h2>
          <p className="text-xs text-ink-400">Last 12 months · live</p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-widest text-ink-600">
            <span className="h-2 w-2 rounded-full bg-brand-500" /> Sales
          </span>
          <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-widest text-ink-600">
            <span className="h-2 w-2 rounded-full bg-ink-700" /> Purchases
          </span>
        </div>
      </div>

      {data.every((d) => d.sales === 0 && d.purchases === 0) ? (
        <div className="grid place-items-center py-16 text-center">
          <div>
            <p className="text-sm text-ink-500">No invoices or purchase orders yet.</p>
            <Link href="/erp/sales/new" className="mt-3 inline-flex items-center gap-1 rounded-sm bg-brand-500 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-ink-950 hover:bg-brand-400">
              Create your first invoice <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          <defs>
            <linearGradient id="salesGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%"   stopColor="#FFCC00" stopOpacity=".45" />
              <stop offset="100%" stopColor="#FFCC00" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((g) => (
            <line key={g} x1={P} x2={W - P} y1={H - P - (H - P * 2) * g} y2={H - P - (H - P * 2) * g} stroke="#ececef" strokeDasharray="3 4" />
          ))}
          <motion.path d={salesArea} fill="url(#salesGrad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.7 }} />
          <motion.path d={toPath(salesPts)}    fill="none" stroke="#FFCC00" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2 }} />
          <motion.path d={toPath(purchasePts)} fill="none" stroke="#22222a" strokeWidth="2.5" strokeDasharray="6 4" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, delay: 0.2 }} />
          {salesPts.map(([x, y], i) => (
            <circle key={`s-${i}`} cx={x} cy={y} r="3.5" fill="#FFCC00" stroke="#0d0d11" strokeWidth="1.5" />
          ))}
          {data.map((d, i) => (
            <text key={d.month} x={P + i * stepX} y={H - 8} textAnchor="middle" fontSize="10" fill="#6b6b75" fontFamily="monospace">
              {fmtMonth(d.month)}
            </text>
          ))}
        </svg>
      )}
    </Card>
  );
}

function TopCustomers({ rows }: { rows: { id: string; name: string; code: string; revenue: number; invoiceCount: number }[] }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl tracking-tight text-ink-900">TOP CUSTOMERS</h2>
        <Link href="/erp/customers" className="text-xs font-bold uppercase tracking-widest text-brand-600 hover:text-brand-500">All →</Link>
      </div>
      {rows.length === 0 ? (
        <EmptyMini text="No revenue yet — top customers appear after the first invoice." />
      ) : (
        <ul className="divide-y divide-ink-100">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center gap-3 py-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-sm bg-brand-500/15 font-display text-sm font-bold text-brand-600">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink-900">{r.name}</div>
                <div className="text-[11px] text-ink-500">{r.invoiceCount} invoice{r.invoiceCount === 1 ? '' : 's'}</div>
              </div>
              <div className="text-right font-mono text-sm font-bold text-ink-900">{aed.format(r.revenue)}</div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function TopProducts({ rows }: { rows: { id: string; name: string; sku: string; quantity: number; revenue: number }[] }) {
  return (
    <Card className="p-5 lg:col-span-2">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl tracking-tight text-ink-900">TOP PRODUCTS</h2>
        <Link href="/erp/products" className="text-xs font-bold uppercase tracking-widest text-brand-600 hover:text-brand-500">Manage →</Link>
      </div>
      {rows.length === 0 ? (
        <EmptyMini text="No sales yet — top products appear once you post invoices." />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-left text-[11px] font-bold uppercase tracking-widest text-ink-500">
              <th className="py-2">#</th>
              <th className="py-2">Product</th>
              <th className="py-2 text-right">Units</th>
              <th className="py-2 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-b border-ink-100 last:border-b-0">
                <td className="py-2.5 text-ink-500">{i + 1}</td>
                <td className="py-2.5">
                  <div className="font-semibold text-ink-900">{r.name}</div>
                  <div className="font-mono text-[10px] text-ink-500">{r.sku}</div>
                </td>
                <td className="py-2.5 text-right font-mono">{r.quantity}</td>
                <td className="py-2.5 text-right font-mono font-bold text-ink-900">{aed.format(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function VatSummary({ vat }: { vat: { output: number; input: number; netPayable: number } }) {
  return (
    <Card className="p-5">
      <div className="mb-4">
        <h2 className="font-display text-xl tracking-tight text-ink-900">VAT POSITION</h2>
        <p className="text-xs text-ink-400">UAE FTA · 5%</p>
      </div>
      <div className="space-y-3 text-sm">
        <Row label="Output VAT (sales)"     value={aed.format(vat.output)} pos />
        <Row label="Input VAT (purchases)"  value={aed.format(vat.input)}  neg />
        <div className="border-t border-ink-200 pt-3">
          <Row
            label={vat.netPayable >= 0 ? 'Net Payable to FTA' : 'Net Refund'}
            value={aed.format(Math.abs(vat.netPayable))}
            big
            tone={vat.netPayable >= 0 ? 'yellow' : 'green'}
          />
        </div>
      </div>
      <div className="mt-4 rounded-sm bg-ink-50 p-3 text-[11px] text-ink-500">
        Snapshot of all posted invoices and LPOs. The formal FTA VAT-return XLSX export lands with the
        Reports module.
      </div>
    </Card>
  );
}

function Row({ label, value, pos, neg, big, tone }: { label: string; value: string; pos?: boolean; neg?: boolean; big?: boolean; tone?: 'yellow' | 'green' }) {
  const valueCls =
    big ? `font-display text-2xl tracking-tight ${tone === 'green' ? 'text-green-600' : 'text-brand-600'}` :
    'font-mono text-ink-900';
  return (
    <div className="flex items-center justify-between">
      <span className={`${big ? 'text-xs font-bold uppercase tracking-widest text-ink-500' : 'text-ink-600'}`}>
        {label}
      </span>
      <span className={valueCls}>
        {pos && !big && <span className="mr-1 text-[10px] text-green-600">+</span>}
        {neg && !big && <span className="mr-1 text-[10px] text-red-600">−</span>}
        {value}
      </span>
    </div>
  );
}

function RecentList({
  title, link, rows, emptyAction,
}: {
  title: string; link: string;
  rows: { id: string; number: string; name: string; date: string; status: string; total: number; href: string }[];
  emptyAction: { label: string; href: string };
}) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl tracking-tight text-ink-900">{title.toUpperCase()}</h2>
        <Link href={link} className="text-xs font-bold uppercase tracking-widest text-brand-600 hover:text-brand-500">View all →</Link>
      </div>
      {rows.length === 0 ? (
        <div className="grid place-items-center py-10 text-center">
          <div>
            <p className="text-sm text-ink-500">Nothing here yet.</p>
            <Link href={emptyAction.href} className="mt-3 inline-flex items-center gap-1 rounded-sm bg-brand-500 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-ink-950 hover:bg-brand-400">
              {emptyAction.label} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-ink-100">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={r.href} className="flex items-center gap-3 py-2.5 hover:bg-brand-500/5">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs font-bold text-ink-900">{r.number}</div>
                  <div className="truncate text-xs text-ink-600">{r.name}</div>
                </div>
                <div className="text-[11px] text-ink-500">{formatDate(r.date)}</div>
                <span className={`chip ring-1 ${STATUS_TONE[r.status] ?? 'ring-ink-200'}`}>{r.status}</span>
                <div className="w-28 text-right font-mono text-sm font-bold text-ink-900">{aed.format(r.total)}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function EmptyMini({ text }: { text: string }) {
  return <div className="grid place-items-center py-10 text-center text-xs text-ink-500">{text}</div>;
}
