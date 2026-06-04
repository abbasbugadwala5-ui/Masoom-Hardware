import { redirect } from 'next/navigation';

// This is an ERP-only deployment — the root sends visitors straight to the
// ERP (which shows the login page when signed out).
export default function Home() {
  redirect('/erp');
}
