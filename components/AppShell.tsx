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

// Shared maroon fill for any surface that needs to carry the brand at full
// strength. The chrome is warm paper now, so this is reserved for content
// elements (e.g. the dashboard's executive band) rather than the header bar.
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
    <div className="min-h-screen nsib-app-surface">
      {/* Mobile scrim */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-nsib-ink/40 backdrop-blur-[2px] z-30 lg:hidden transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-nsib-ivory flex flex-col shadow-rail transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Hairline gold edge instead of a hard border — reads as a rule, not a seam. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-nsib-gold/10 via-nsib-gold/55 to-nsib-gold/10"
        />

        {/* Brand block carries the maroon so the rail reads as branded chrome.
            73px = the header's 4.5rem bar plus its 1px gold divider, so this
            block's own rule lands exactly on the header's. */}
        <div className={`relative flex items-center gap-3 px-5 h-[73px] shrink-0 ${BRAND_GRADIENT}`}>
          <div aria-hidden="true" className="absolute inset-0 nsib-header-sheen" />
          {/* Cropped to the crest — the full lockup's wordmark is illegible at 44px */}
          <span className="relative w-11 h-11 rounded-xl bg-white flex items-center justify-center shrink-0 p-1 shadow-card ring-1 ring-nsib-gold/50 overflow-hidden">
            <BrandLogo className="w-full h-full" fit="object-cover object-top" />
          </span>
          <div className="relative font-bold text-nsib-cream-light text-lg tracking-[0.22em] leading-none">NSIB</div>
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px nsib-gold-rule" />
        </div>

        <nav className="relative flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const isActive = active === item.view;
            return (
              <button
                key={item.view}
                onClick={() => go(item.view)}
                className={`group relative w-full flex items-center gap-3 pl-4 pr-3 py-3 rounded-xl text-sm text-left transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-nsib-gold-soft to-white text-nsib-red font-bold ring-1 ring-nsib-gold/45 shadow-card'
                    : 'text-nsib-ink/70 font-semibold ring-1 ring-transparent hover:bg-white/80 hover:text-nsib-red hover:ring-nsib-sand'
                }`}
              >
                {/* Thin maroon indicator marks the active view; gold previews on hover. */}
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-200 ${
                    isActive ? 'h-8 bg-nsib-red' : 'h-0 bg-nsib-gold group-hover:h-5'
                  }`}
                />
                <span
                  className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-all duration-200 ${
                    isActive
                      ? 'bg-nsib-red text-white shadow-nav-active'
                      : 'text-nsib-muted ring-1 ring-nsib-sand group-hover:text-nsib-red group-hover:ring-nsib-gold/50 group-hover:bg-nsib-gold-soft'
                  }`}
                >
                  <NavIcon view={item.view} filled={isActive} />
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* MAIN COLUMN */}
      <div className="lg:pl-64">
        {/* Deep maroon executive header: gold eyebrow over a cream title, closed
            by a gold divider. */}
        <header className="sticky top-0 z-20 bg-gradient-to-br from-nsib-red via-nsib-red-dark to-nsib-red-deep shadow-header">
          <div aria-hidden="true" className="absolute inset-0 nsib-header-sheen" />

          <div className="relative flex items-center gap-4 px-4 sm:px-6 lg:px-8 h-[4.5rem]">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-1 rounded-lg text-nsib-gold-light ring-1 ring-nsib-gold/40 hover:bg-white/12 hover:ring-nsib-gold transition duration-200"
              aria-label="Open navigation"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
            </button>

            {/* Eyebrow over title — editorial hierarchy rather than title-over-caption. */}
            <div className="min-w-0 flex-1">
              {subtitle && (
                <p className="text-[0.6rem] sm:text-[0.65rem] font-bold uppercase tracking-[0.22em] text-nsib-gold truncate">
                  {subtitle}
                </p>
              )}
              <h1 className="text-xl sm:text-[1.4rem] leading-tight font-bold text-nsib-cream-light tracking-tight truncate">
                {title}
              </h1>
            </div>

            {headerExtra}

            {/* User icon — replaces the old user-management section */}
            <div className="relative shrink-0" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(open => !open)}
                className="w-11 h-11 rounded-full bg-gradient-to-br from-nsib-gold-light via-nsib-gold to-nsib-gold-dark text-nsib-red-deep text-sm font-bold flex items-center justify-center ring-2 ring-nsib-gold/40 hover:ring-white/80 shadow-card hover:shadow-card-hover transition-all duration-200 hover:-translate-y-0.5"
                aria-label="Account menu"
                aria-expanded={menuOpen}
              >
                {initials}
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-card-hover border border-nsib-gold/30 overflow-hidden">
                  <div className="px-4 py-3 bg-gradient-to-r from-nsib-gold-soft to-nsib-cream-light border-b border-nsib-gold/25">
                    <div className="font-bold text-nsib-ink truncate">{user?.name || 'NSIB User'}</div>
                    <div className="text-xs text-nsib-muted truncate">{user?.email || '—'}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm font-semibold text-nsib-red hover:bg-nsib-red-soft transition duration-200"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Gold divider closes the maroon band */}
          <div aria-hidden="true" className="relative h-px nsib-gold-rule" />
        </header>

        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
