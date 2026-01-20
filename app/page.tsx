// app/page.tsx - Login Page

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const checkExistingAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          // Already logged in, redirect based on role
          if (data.user.role === 'admin') {
            router.push('/admin');
          } else {
            router.push('/dashboard');
          }
          return;
        }
      }
    } catch (err) {
      console.error('Auth check error:', err);
    } finally {
      setCheckingAuth(false);
    }
  }, [router]);

  // Check if already logged in
  useEffect(() => {
    checkExistingAuth();
  }, [checkExistingAuth]);

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
        // Redirect based on role
        if (data.user.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
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
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-xl mb-4">
            <span className="text-3xl font-bold text-indigo-600">NS</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">NSIB Motor Insurance</h1>
          <p className="text-indigo-200">Quote Comparison System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Sign In</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition text-gray-900"
                placeholder="Enter your email"
                required
                disabled={loading}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition text-gray-900"
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl font-bold text-white transition ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center mb-4">Demo Credentials</p>
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Admin:</span>
                  <span className="text-gray-600">admin@nsib.ae / admin123</span>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">HOD:</span>
                  <span className="text-gray-600">hod@nsib.ae / hod123</span>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Advisor:</span>
                  <span className="text-gray-600">advisor@nsib.ae / advisor123</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-indigo-200 text-sm mt-6">
          © 2024 New Shield Insurance Brokers L.L.C.
        </p>
      </div>
    </div>
  );
}
