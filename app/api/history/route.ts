import { put, list, del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

// Every save writes a NEW pathname (quotes-history-shared-<suffix>.json) and
// reads pick the newest one. A fixed pathname cannot work: blob URLs are served
// through a CDN that ignores query strings when computing the cache key and
// holds objects long past their max-age, and each region caches independently.
// That meant a function could read back a stale copy of the file it had just
// written - saves landed in storage but never appeared in Saved History. A
// unique pathname per version has never been cached, so it always reads fresh.
const HISTORY_PREFIX = 'quotes-history-shared';
const HISTORY_FILE = `${HISTORY_PREFIX}.json`;

// Older versions to retain. They are effectively free rolling backups of a file
// that is otherwise overwritten in place on every save.
const VERSIONS_TO_KEEP = 5;

// A single quote inside a comparison. Kept loose but typed (no `any`) because
// recovered records only carry a subset of these fields.
interface Quote {
  id?: string;
  company?: string;
  customerName?: string;
  enquiryNumber?: string;
  make?: string;
  model?: string;
  premium?: number;
  vat?: number;
  total?: number;
  isRecommended?: boolean;
  isRenewal?: boolean;
  recovered?: boolean;
  [key: string]: unknown;
}

interface SavedComparison {
  id: string;
  date: string;
  vehicle: string;
  quotes: Quote[];
  referenceNumber: string;
  fileUrl?: string;
  createdBy?: string;
  rebuilt?: boolean;
}

// ---------------------------------------------------------------------------
// Read the current shared history JSON.
//
// This MUST throw rather than return [] when the blob exists but cannot be
// read. Callers write back whatever this returns, so a silent [] on a transient
// read failure would overwrite the entire shared history with a single record.
// An empty result is only ever legitimate when no history blob exists at all.
// ---------------------------------------------------------------------------
// Newest first. Includes the legacy fixed-pathname blob, which sorts in by
// uploadedAt like any other version and is read from until the first new save.
async function listHistoryVersions() {
  const { blobs } = await list({ prefix: HISTORY_PREFIX });
  return blobs
    .filter((b) => b.pathname.endsWith('.json'))
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

async function getHistory(): Promise<SavedComparison[]> {
  const versions = await listHistoryVersions();
  if (versions.length === 0) return [];

  const response = await fetch(versions[0].url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Failed to read history blob: HTTP ${response.status}`);
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new Error('History blob is not an array; refusing to overwrite it');
  }

  return data as SavedComparison[];
}

// ---------------------------------------------------------------------------
// Save history to a NEW pathname every time, then prune old versions. Writing
// to a fresh URL is what guarantees the next read is not served from a stale
// CDN copy; see the note on HISTORY_PREFIX.
// ---------------------------------------------------------------------------
async function saveHistory(history: SavedComparison[]): Promise<string> {
  const blob = await put(HISTORY_FILE, JSON.stringify(history), {
    access: 'public',
    addRandomSuffix: true,
    cacheControlMaxAge: 0,
  });

  // Prune only AFTER the new version is durably written, so a failure here
  // never leaves the history without a readable copy.
  try {
    const versions = await listHistoryVersions();
    const stale = versions.filter((v) => v.url !== blob.url).slice(VERSIONS_TO_KEEP);
    if (stale.length > 0) {
      await del(stale.map((v) => v.url));
    }
  } catch (err) {
    console.error('History version prune failed (non-fatal):', err);
  }

  return blob.url;
}

// ---------------------------------------------------------------------------
// Parse an NSIB_*.html blob pathname into the pieces needed for a history card.
//   NSIB_{CUSTOMER...}_{MAKE}_{MODEL}_{REF}.html
//   NSIB_{CUSTOMER...}_{MAKE}_{MODEL}_{REF}_UPDATED_{timestamp}.html
// ---------------------------------------------------------------------------
interface ParsedBlob {
  referenceNumber: string;
  customer: string;
  vehicle: string;
  make: string;
  model: string;
  fileUrl: string;
  updatedTs: number;
}

function parseBlobName(pathname: string, url: string): ParsedBlob | null {
  if (!pathname.startsWith('NSIB_') || !pathname.endsWith('.html')) return null;

  let base = pathname.slice('NSIB_'.length, -'.html'.length);

  let updatedTs = 0;
  const updMatch = base.match(/_UPDATED_(\d+)$/);
  if (updMatch) {
    updatedTs = parseInt(updMatch[1], 10) || 0;
    base = base.slice(0, updMatch.index);
  }

  const refMatch = base.match(/_(\d{4,})$/);
  if (!refMatch || refMatch.index === undefined) return null;
  const referenceNumber = refMatch[1];
  const beforeRef = base.slice(0, refMatch.index);

  const parts = beforeRef.split('_').filter(Boolean);
  let customer = beforeRef.replace(/_/g, ' ').trim();
  let make = '';
  let model = '';
  if (parts.length >= 2) {
    make = parts[parts.length - 2];
    model = parts[parts.length - 1];
    customer = parts.slice(0, parts.length - 2).join(' ').trim() || customer;
  } else if (parts.length === 1) {
    make = parts[0];
  }
  const vehicle = `${make} ${model}`.trim();

  return { referenceNumber, customer, vehicle, make, model, fileUrl: url, updatedTs };
}

// ---------------------------------------------------------------------------
// Rebuild history from every NSIB_*.html blob. Paginates through all pages,
// keeps the newest file per reference number, and merges with existing entries
// (preserving any record that already has real structured quote data).
// ---------------------------------------------------------------------------
async function rebuildFromBlobs(): Promise<{ added: number; total: number; scanned: number }> {
  const allBlobs: { pathname: string; url: string }[] = [];
  let cursor: string | undefined = undefined;
  let hasMore = true;
  while (hasMore) {
    const page: Awaited<ReturnType<typeof list>> = await list({ cursor, limit: 1000 });
    for (const b of page.blobs) {
      allBlobs.push({ pathname: b.pathname, url: b.url });
    }
    cursor = page.cursor;
    hasMore = page.hasMore;
  }

  const newest = new Map<string, ParsedBlob>();
  let scanned = 0;
  for (const blob of allBlobs) {
    const parsed = parseBlobName(blob.pathname, blob.url);
    if (!parsed) continue;
    scanned++;
    const existing = newest.get(parsed.referenceNumber);
    if (!existing || parsed.updatedTs >= existing.updatedTs) {
      newest.set(parsed.referenceNumber, parsed);
    }
  }

  const existingHistory = await getHistory();
  const byRef = new Map<string, SavedComparison>();
  for (const item of existingHistory) {
    if (item.referenceNumber) byRef.set(item.referenceNumber, item);
  }

  let added = 0;
  for (const entry of newest) {
    const ref = entry[0];
    const parsed = entry[1];
    const existing = byRef.get(ref);

    // Keep richer, editable records untouched; just backfill a fileUrl.
    if (existing && Array.isArray(existing.quotes) && existing.quotes.length > 0 && existing.quotes[0].total !== undefined && !existing.quotes[0].recovered) {
      if (!existing.fileUrl) existing.fileUrl = parsed.fileUrl;
      continue;
    }

    byRef.set(ref, {
      id: existing?.id || `rebuilt_${ref}`,
      date: existing?.date || new Date().toISOString(),
      vehicle: existing?.vehicle || parsed.vehicle,
      referenceNumber: ref,
      fileUrl: parsed.fileUrl,
      createdBy: existing?.createdBy || 'Recovered',
      rebuilt: true,
      quotes: [
        {
          id: `rec_${ref}`,
          company: 'View document for full details',
          customerName: parsed.customer,
          enquiryNumber: '',
          make: parsed.make,
          model: parsed.model,
          premium: 0,
          vat: 0,
          total: 0,
          recovered: true,
        },
      ],
    });
    if (!existing) added++;
  }

  const merged = Array.from(byRef.values()).sort((a, b) => {
    const da = Date.parse(a.date || '') || 0;
    const db = Date.parse(b.date || '') || 0;
    if (db !== da) return db - da;
    return b.referenceNumber.localeCompare(a.referenceNumber);
  });

  await saveHistory(merged);
  return { added, total: merged.length, scanned };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    if (searchParams.get('debug') === 'true') {
      const { blobs } = await list();
      return NextResponse.json({
        success: true,
        blobs: blobs.map((b) => ({ name: b.pathname, url: b.url, size: b.size })),
      });
    }

    const history = await getHistory();
    return NextResponse.json({ success: true, history, count: history.length });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch history' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // One-time recovery: POST /api/history?rebuild=true
    if (searchParams.get('rebuild') === 'true') {
      try {
        const result = await rebuildFromBlobs();
        return NextResponse.json({ success: true, ...result });
      } catch (err) {
        return NextResponse.json(
          { success: false, error: 'Rebuild failed', detail: String(err) },
          { status: 500 },
        );
      }
    }

    const body: unknown = await request.json();
    const item = (body as { item?: SavedComparison }).item;

    if (!item || !item.referenceNumber) {
      return NextResponse.json({ success: false, error: 'Invalid item - missing referenceNumber' }, { status: 400 });
    }

    const history = await getHistory();
    const existingIndex = history.findIndex((h) => h.referenceNumber === item.referenceNumber);

    if (existingIndex !== -1) {
      if (!item.fileUrl && history[existingIndex].fileUrl) {
        item.fileUrl = history[existingIndex].fileUrl;
      }
      history[existingIndex] = item;
    } else {
      history.unshift(item);
    }

    await saveHistory(history);
    return NextResponse.json({ success: true, updated: existingIndex !== -1 });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Failed to save', detail: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const refNum = searchParams.get('ref');

    if (!id && !refNum) {
      return NextResponse.json({ success: false, error: 'Missing id or ref parameter' }, { status: 400 });
    }

    let history = await getHistory();
    if (refNum) {
      history = history.filter((h) => h.referenceNumber !== refNum);
    } else {
      history = history.filter((h) => h.id !== id);
    }

    await saveHistory(history);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Failed to delete', detail: String(err) }, { status: 500 });
  }
}
