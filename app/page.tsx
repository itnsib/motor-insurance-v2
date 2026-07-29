// app/page.tsx - Login Page

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/AppShell';

const FEATURES = [
  {
    title: 'Secure & Reliable',
    icon: <path d="M12 3 20 6v6c0 4.4-3.2 7.9-8 9-4.8-1.1-8-4.6-8-9V6l8-3Z" />,
  },
  {
    title: 'Save Time',
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: 'Better Insights',
    icon: <path d="M5 19V11M12 19V5M19 19v-5M3 21h18" strokeLinecap="round" />,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const checkExistingAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
          router.push('/dashboard');
          return;
        }
      }
    } catch (err) {
      console.error('Auth check error:', err);
    } finally {
      setCheckingAuth(false);
    }
  }, [router]);

  useEffect(() => {
    checkExistingAuth();
  }, [checkExistingAuth]);

  useEffect(() => {
    // "Remember me" only ever stores the address, never the password.
    const saved = localStorage.getItem('rememberedEmail');
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.user));
        if (remember) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        router.push('/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-nsib-cream flex items-center justify-center">
        <div className="text-nsib-muted text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    // h-screen + overflow-hidden: the whole scene is sized to the viewport, so
    // nothing ever scrolls off. The left column absorbs slack via the mascot.
    <div className="relative h-screen overflow-hidden bg-gradient-to-br from-nsib-cream-light via-nsib-cream to-nsib-gold-soft">
      {/* Decorative brand waves */}
      <svg
        className="pointer-events-none absolute inset-x-0 bottom-0 w-full h-[18vh]"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0 140C260 60 520 250 860 210s430-140 580-170v280H0Z" fill="#D9A441" opacity="0.35" />
        <path d="M0 200C280 120 540 300 880 258s420-118 560-148v290H0Z" fill="#D9A441" />
        <path d="M0 228C280 150 540 328 880 286s420-112 560-142v296H0Z" fill="#C0122B" />
      </svg>

      {/* Near-full-width rather than a narrow centred container, so the left
          column starts at the page edge and the logo genuinely sits in the corner. */}
      <div className="relative z-10 h-full max-w-[1800px] mx-auto px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* LEFT — logo, headline, mascot. min-h-0 lets the flex children shrink. */}
        <div className="hidden lg:flex flex-col min-h-0 py-6">
          {/* Portrait box matches the lockup's 0.79 ratio so nothing letterboxes.
              Sits flush at the column's left edge — i.e. the page corner. */}
          <BrandLogo className="w-[7.5rem] h-[9.5rem] shrink-0" />

          <h1 className="mt-5 text-[2.3rem] leading-[1.15] font-bold text-nsib-ink shrink-0">
            Smarter Comparisons,
            <br />
            <span className="text-nsib-red">Stronger Decisions.</span>
          </h1>

          <div className="w-16 h-1 bg-nsib-gold rounded-full mt-5 shrink-0" />

          <div className="mt-5 flex flex-wrap gap-2.5 shrink-0">
            {FEATURES.map(feature => (
              <span
                key={feature.title}
                className="inline-flex items-center gap-2 bg-white/80 backdrop-blur border border-nsib-gold/40 shadow-card rounded-full pl-2 pr-3.5 py-1.5"
              >
                <span className="w-7 h-7 rounded-full bg-nsib-red-soft flex items-center justify-center text-nsib-red shrink-0">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    {feature.icon}
                  </svg>
                </span>
                <span className="text-sm font-semibold text-nsib-ink">{feature.title}</span>
              </span>
            ))}
          </div>

          {/* Mascot takes whatever height is left over, so the column always
              fills the viewport exactly and never overflows on short screens. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mascot.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none select-none flex-1 min-h-0 w-full mt-2 object-contain object-bottom drop-shadow-[0_18px_30px_rgba(43,33,24,0.22)]"
          />
        </div>

        {/* RIGHT — sign in. Scrolls inside itself rather than growing the page
            if the card is ever taller than a short viewport. */}
        <div className="flex items-center justify-center min-h-0 py-6 overflow-y-auto">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-3xl shadow-card-hover border border-nsib-gold/40 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-nsib-red via-nsib-gold to-nsib-red" />
              <div className="p-8 sm:p-10">
                <div className="flex flex-col items-center mb-7">
                  <span className="w-14 h-14 rounded-full bg-nsib-red-soft flex items-center justify-center text-nsib-red mb-4">
                    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="12" cy="8" r="3.5" />
                      <path d="M5 20a7 7 0 0 1 14 0" strokeLinecap="round" />
                    </svg>
                  </span>
                  <h2 className="text-2xl font-bold text-nsib-ink">Welcome Back!</h2>
                  <p className="text-sm text-nsib-muted mt-1">Sign in to continue to your account</p>
                </div>

                {error && (
                  <div className="bg-nsib-red-soft border border-nsib-red/25 text-nsib-red px-4 py-3 rounded-xl mb-5 text-sm font-medium">
                    {error}
                  </div>
                )}

                <form onSubmit={handleLogin}>
                  <div className="mb-5">
                    <label className="block text-sm font-semibold text-nsib-ink mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-nsib-red">
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <rect x="3" y="5" width="18" height="14" rx="2.5" />
                          <path d="m3.5 7 8.5 6 8.5-6" />
                        </svg>
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 bg-nsib-cream/50 border border-nsib-sand rounded-xl focus:border-nsib-gold focus:bg-white focus:outline-none transition text-nsib-ink"
                        placeholder="Enter your email"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-nsib-ink mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-nsib-red">
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <rect x="4" y="10" width="16" height="10" rx="2.5" />
                          <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
                        </svg>
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-12 pr-12 py-3.5 bg-nsib-cream/50 border border-nsib-sand rounded-xl focus:border-nsib-gold focus:bg-white focus:outline-none transition text-nsib-ink"
                        placeholder="Enter your password"
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-nsib-muted hover:text-nsib-red transition"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
                          <circle cx="12" cy="12" r="3" />
                          {!showPassword && <path d="m4 4 16 16" strokeLinecap="round" />}
                        </svg>
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 mb-6 cursor-pointer w-fit">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-nsib-ink">Remember me</span>
                  </label>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full py-4 rounded-xl font-bold text-white transition flex items-center justify-center gap-2 ${
                      loading
                        ? 'bg-nsib-muted cursor-not-allowed'
                        : 'bg-gradient-to-r from-nsib-red to-nsib-red-dark hover:from-nsib-red-dark hover:to-nsib-red shadow-card hover:shadow-card-hover'
                    }`}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign In
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            <div className="text-center mt-6 space-y-1">
              <p className="text-sm text-nsib-muted flex items-center justify-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-nsib-red" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 3 20 6v6c0 4.4-3.2 7.9-8 9-4.8-1.1-8-4.6-8-9V6l8-3Z" />
                </svg>
                Your security is our priority
              </p>
              <p className="text-xs text-nsib-muted">
                © {new Date().getFullYear()} New Shield Insurance Brokers L.L.C. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
