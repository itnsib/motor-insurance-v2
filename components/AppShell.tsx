// components/AppShell.tsx - NSIB branded application shell (sidebar + header)

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export type AppView = 'dashboard' | 'generator' | 'history';

interface ShellUser {
  name?: string;
  email?: string;
}

interface AppShellProps {
  active: AppView;
  onNavigate: (view: AppView) => void;
  title: string;
  subtitle?: string;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}

// The top bar is two separate elements (sidebar brand block + page header). A
// horizontal gradient restarts at the seam and makes them look like two different
// reds, so both share this vertical one instead — identical at every x.
export const BRAND_GRADIENT = 'bg-gradient-to-b from-nsib-red to-nsib-red-dark';

// ============ BRAND LOGO ============
// Uses public/nsib-logo.png when present, falling back to the inline shield so
// the app never renders a broken image if the asset is missing.
// The asset is a tall lockup (crest + ribbon + wordmark). `fit` lets callers
// show the whole thing where there is room, or crop to just the crest where
// there isn't — the wordmark is unreadable below ~120px tall.
export function BrandLogo({
  className = 'w-9 h-9',
  fit = 'object-contain',
}: {
  className?: string;
  fit?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) return <NsibMark className={className} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/nsib-logo.png"
      alt="NSIB — New Shield Insurance Brokers"
      className={`${className} ${fit}`}
      onError={() => setFailed(true)}
    />
  );
}

// ============ BRAND MARK (fallback) ============
export function NsibMark({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 56" className={className} aria-hidden="true">
      <path
        d="M24 2 44 9v20c0 12-8.6 21-20 25C12.6 50 4 41 4 29V9L24 2Z"
        fill="#C0122B"
        stroke="#D9A441"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <text
        x="24"
        y="32"
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fill="#F5D98B"
        fontFamily="system-ui, sans-serif"
      >
        NSIB
      </text>
    </svg>
  );
}

// ============ ICONS ============
const ICON_PATHS: Record<AppView, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="10" width="7" height="11" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  generator: (
    <>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </>
  ),
  history: (
    <>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h3.2a2 2 0 0 1 1.6.8l.9 1.2h7.3A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z" />
    </>
  ),
};

function NavIcon({ view, filled }: { view: AppView; filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-5 h-5 shrink-0"
      fill={view === 'generator' ? 'none' : filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={view === 'generator' ? 2.2 : 1.7}
    >
      {ICON_PATHS[view]}
    </svg>
  );
}

const NAV_ITEMS: { view: AppView; label: string }[] = [
  { view: 'dashboard', label: 'Dashboard' },
  { view: 'generator', label: 'Create Comparison' },
  { view: 'history', label: 'Saved History' },
];

// ============ SHELL ============
export default function AppShell({
  active,
  onNavigate,
  title,
  subtitle,
  headerExtra,
  children,
}: AppShellProps) {
  const router = useRouter();
  const [user, setUser] = useState<ShellUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // localStorage paints instantly; the session call corrects it if stale.
    try {
      const cached = localStorage.getItem('user');
      if (cached) setUser(JSON.parse(cached));
    } catch {
      /* ignore malformed cache */
    }

    let cancelled = false;
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!cancelled && data?.success && data.user) {
          setUser(data.user);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
      })
      .catch(() => {
        /* offline: keep the cached identity */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickAway = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [menuOpen]);

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* clear the client session regardless */
    }
    localStorage.removeItem('user');
    router.push('/');
  }, [router]);

  const initials = (user?.name || user?.email || 'NS')
    .split(' ')
    .map(part => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const go = (view: AppView) => {
    onNavigate(view);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-nsib-cream">
      {/* Mobile scrim */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-nsib-ink/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-nsib-sand flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand block carries the same red as the page header so the two read as
            one continuous bar across the top of the app. */}
        <div className={`flex items-center gap-3 px-5 h-20 ${BRAND_GRADIENT}`}>
          {/* Cropped to the crest — the full lockup's wordmark is illegible at 48px */}
          <span className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0 p-1 shadow-card overflow-hidden">
            <BrandLogo className="w-full h-full" fit="object-cover object-top" />
          </span>
          <div className="font-bold text-white text-xl tracking-wide">NSIB</div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(item => {
            const isActive = active === item.view;
            return (
              <button
                key={item.view}
                onClick={() => go(item.view)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                  isActive
                    ? 'bg-nsib-red text-white shadow-card'
                    : 'text-nsib-ink/80 hover:bg-nsib-gold-soft hover:text-nsib-red'
                }`}
              >
                <NavIcon view={item.view} filled={isActive} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* MAIN COLUMN */}
      <div className="lg:pl-64">
        <header className={`sticky top-0 z-20 ${BRAND_GRADIENT} text-white shadow-card`}>
          <div className="flex items-center gap-4 px-4 sm:px-6 h-20">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-white/15 transition"
              aria-label="Open navigation"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold truncate">{title}</h1>
              {subtitle && <p className="text-white/70 text-xs sm:text-sm truncate">{subtitle}</p>}
            </div>

            {headerExtra}

            {/* User icon — replaces the old user-management section */}
            <div className="relative shrink-0" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(open => !open)}
                className="w-11 h-11 rounded-full bg-nsib-gold text-nsib-red-dark font-bold flex items-center justify-center ring-2 ring-white/40 hover:ring-white transition"
                aria-label="Account menu"
                aria-expanded={menuOpen}
              >
                {initials}
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-card-hover border border-nsib-sand overflow-hidden">
                  <div className="px-4 py-3 bg-nsib-gold-soft border-b border-nsib-sand">
                    <div className="font-bold text-nsib-ink truncate">{user?.name || 'NSIB User'}</div>
                    <div className="text-xs text-nsib-muted truncate">{user?.email || '—'}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm font-semibold text-nsib-red hover:bg-nsib-red-soft transition"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
