import { put, list } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

const HISTORY_FILE = 'quotes-history-shared.json';

interface SavedComparison {
  id: string;
  date: string;
  vehicle: string;
  quotes: unknown[];
  referenceNumber: string;
  fileUrl?: string;
  createdBy?: string;
  customer?: string;
  enquiryNumber?: string;
  rebuilt?: boolean;
}

// ---------------------------------------------------------------------------
// Helper: read the current shared history JSON (and only that file).
// Unlike the old version, this does NOT early-return on the first non-empty
// JSON it finds elsewhere — it specifically loads the canonical shared file.
// ---------------------------------------------------------------------------
async function getHistory(): Promise<SavedComparison[]> {
  try {
    const { blobs } = await list();
    const historyBlob = blobs.find(b => b.pathname === HISTORY_FILE);
    if (historyBlob) {
      const response = await fetch(historyBlob.url, { cache: 'no-store' });
      const data = await response.json();
      if (Array.isArray(data)) return data;
    }
    return [];
  } catch {
    return [];
  }
}

async function saveHistory(history: SavedComparison[]): Promise<string> {
  const blob = await put(HISTORY_FILE, JSON.stringify(history), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true, // required: the file already exists, so overwrite it
    cacheControlMaxAge: 60, // short cache so refreshes show new data quickly
  });
  return blob.url;
}

// ---------------------------------------------------------------------------
// Parse an NSIB_*.html blob pathname into a history entry.
//
// Filename shape:
//   NSIB_{CUSTOMER...}_{MAKE}_{MODEL}_{REF}.html
//   NSIB_{CUSTOMER...}_{MAKE}_{MODEL}_{REF}_UPDATED_{timestamp}.html
//
// Strategy:
//   - strip ".html"
//   - strip a trailing "_UPDATED_{digits}" segment if present (and remember it
//     so we can pick the newest version per reference)
//   - the reference number is the LAST remaining "_<digits>" group
//   - the vehicle (make + model) is best-effort; the customer is everything
//     before it. We don't need perfect vehicle parsing for recovery — the
//     fileUrl is the source of truth for the document itself.
// ---------------------------------------------------------------------------
interface ParsedBlob {
  referenceNumber: string;
  customer: string;
  vehicle: string;
  fileUrl: string;
  updatedTs: number; // 0 if not an _UPDATED_ file; used to pick newest
}

function parseBlobName(pathname: string, url: string): ParsedBlob | null {
  if (!pathname.startsWith('NSIB_') || !pathname.endsWith('.html')) return null;

  let base = pathname.slice('NSIB_'.length, -'.html'.length);

  // Detect and strip a trailing _UPDATED_<digits>
  let updatedTs = 0;
  const updMatch = base.match(/_UPDATED_(\d+)$/);
  if (updMatch) {
    updatedTs = parseInt(updMatch[1], 10) || 0;
    base = base.slice(0, updMatch.index);
  }

  // The reference number is the last _<digits> group (decoded URL is fine here
  // because the pathname comes already-decoded from the blob list)
  const refMatch = base.match(/_(\d{4,})$/);
  if (!refMatch) return null;
  const referenceNumber = refMatch[1];
  const beforeRef = base.slice(0, refMatch.index); // CUSTOMER_MAKE_MODEL

  // Best-effort split: last two underscore groups ≈ make + model,
  // everything before ≈ customer. Falls back gracefully.
  const parts = beforeRef.split('_').filter(Boolean);
  let customer = beforeRef.replace(/_/g, ' ').trim();
  let vehicle = '';
  if (parts.length >= 2) {
    vehicle = `${parts[parts.length - 2]} ${parts[parts.length - 1]}`.trim();
    customer = parts.slice(0, parts.length - 2).join(' ').trim() || customer;
  } else {
    vehicle = parts.join(' ').trim();
  }

  return {
    referenceNumber,
    customer,
    vehicle,
    fileUrl: url,
    updatedTs,
  };
}

// ---------------------------------------------------------------------------
// Rebuild history from all NSIB_*.html blobs.
// Keeps the newest file per reference number. Merges with existing entries:
// an existing entry that already has structured `quotes` is preserved
// (so editable Version-2 records and their data are not clobbered).
// ---------------------------------------------------------------------------
async function rebuildFromBlobs(): Promise<{ added: number; total: number; scanned: number }> {
  const { blobs } = await list();

  const newest = new Map<string, ParsedBlob>();
  let scanned = 0;

  for (const blob of blobs) {
    const parsed = parseBlobName(blob.pathname, blob.url);
    if (!parsed) continue;
    scanned++;
    const existing = newest.get(parsed.referenceNumber);
    // Prefer the file with the higher _UPDATED_ timestamp; an _UPDATED_ file
    // always beats a base file (updatedTs 0).
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
  for (const [ref, parsed] of newest) {
    const existing = byRef.get(ref);
    if (existing && Array.isArray(existing.quotes) && existing.quotes.length > 0) {
      // Keep the richer, editable record; just backfill a fileUrl if missing.
      if (!existing.fileUrl) existing.fileUrl = parsed.fileUrl;
      continue;
    }
    byRef.set(ref, {
      id: existing?.id || `rebuilt_${ref}`,
      date: existing?.date || new Date().toISOString(),
      vehicle: existing?.vehicle || parsed.vehicle,
      customer: existing?.customer || parsed.customer,
      quotes: existing?.quotes || [],
      referenceNumber: ref,
      fileUrl: parsed.fileUrl,
      createdBy: existing?.createdBy || 'Recovered',
      rebuilt: true,
    });
    if (!existing) added++;
  }

  const merged = Array.from(byRef.values()).sort((a, b) => {
    // newest first, by date when available, else by reference
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
    const debug = searchParams.get('debug');

    if (debug === 'true') {
      const { blobs } = await list();
      return NextResponse.json({
        success: true,
        blobs: blobs.map(b => ({ name: b.pathname, url: b.url, size: b.size })),
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

    // ---- One-time recovery action: POST /api/history?rebuild=true ----
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

    const { item } = await request.json() as { item: SavedComparison };

    if (!item || !item.referenceNumber) {
      return NextResponse.json({ success: false, error: 'Invalid item - missing referenceNumber' }, { status: 400 });
    }

    const history = await getHistory();
    const existingIndex = history.findIndex(h => h.referenceNumber === item.referenceNumber);

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
      history = history.filter(h => h.referenceNumber !== refNum);
    } else {
      history = history.filter(h => h.id !== id);
    }

    await saveHistory(history);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Failed to delete', detail: String(err) }, { status: 500 });
  }
}
