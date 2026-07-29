// app/admin/page.tsx
//
// The separate admin console (Overview / Users / All Files / Settings) has been
// retired. Users management is gone (single account, now surfaced as the account
// icon in the header) and the All Files + Settings tabs reported numbers that did
// not reflect real data. Everything that remained lives in the Dashboard view of
// the main app, so this route just forwards there and keeps old links working.

import { redirect } from 'next/navigation';

export default function AdminPage() {
  redirect('/dashboard');
}
