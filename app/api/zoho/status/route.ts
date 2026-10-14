import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/zoho/status
//
// Says whether this deployment can sign in to Zoho, for diagnosing a broken
// search without dashboard access. Never returns the values themselves: each
// setting is reported as its length, a short hash to compare against a known
// good copy, and whether it carries stray quotes or whitespace from pasting.

const describe = (value: string | undefined) => {
  if (!value) return { set: false };
  return {
    set: true,
    length: value.length,
    sha256: createHash('sha256').update(value).digest('hex').slice(0, 8),
    strayWhitespace: value !== value.trim(),
    quoted: /^["']|["']$/.test(value.trim()),
  };
};

export async function GET(request: Request) {
  if (!getSession(request)) {
    return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  }

  const { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN } = process.env;
  const accountsUrl = process.env.ZOHO_ACCOUNTS_URL || 'https://accounts.zoho.com';

  let signIn: string;
  try {
    const res = await fetch(`${accountsUrl}/oauth/v2/token`, {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: ZOHO_CLIENT_ID || '',
        client_secret: ZOHO_CLIENT_SECRET || '',
        refresh_token: ZOHO_REFRESH_TOKEN || '',
      }),
      cache: 'no-store',
    });
    const body = await res.json().catch(() => ({}));
    signIn = body.access_token ? `ok (${body.scope || 'no scope reported'})` : `failed: ${body.error || res.status}`;
  } catch (error) {
    signIn = `failed: ${error instanceof Error ? error.message : 'network error'}`;
  }

  return NextResponse.json({
    deployment: {
      env: process.env.VERCEL_ENV || 'local',
      commit: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7),
      url: process.env.VERCEL_URL || '',
    },
    accountsUrl,
    apiUrl: process.env.ZOHO_API_URL || 'https://www.zohoapis.com',
    ZOHO_CLIENT_ID: describe(ZOHO_CLIENT_ID),
    ZOHO_CLIENT_SECRET: describe(ZOHO_CLIENT_SECRET),
    ZOHO_REFRESH_TOKEN: describe(ZOHO_REFRESH_TOKEN),
    signIn,
  });
}
