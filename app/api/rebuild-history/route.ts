import { list, put } from '@vercel/blob';
import { NextResponse } from 'next/server';

const HISTORY_FILE = 'nsib-history.json';
const BLOB_BASE_URL = 'https://gwnpkxzk3ye0v7zh.public.blob.vercel-storage.com';

interface HistoryItem {
  id: string;
  date?: string;
  fileUrl?: string;
  vehicle?: string;
  customerName?: string;
  referenceNumber?: string;
}

export async function GET() {
  try {
    let existingHistory: HistoryItem[] = [];
    try {
      const response = await fetch(`${BLOB_BASE_URL}/${HISTORY_FILE}?t=${Date.now()}`);
      if (response.ok) existingHistory = await response.json();
    } catch { existingHistory = []; }

    const existingUrls = new Set(existingHistory.map(h => h.fileUrl).filter(Boolean));

    const allHtmlFiles: Array<{ pathname: string; url: string; uploadedAt: Date }> = [];
    let cursor: string | undefined;
    let totalScanned = 0;

    do {
      const result = await list({ cursor, limit: 1000 });
      totalScanned += result.blobs.length;
      const htmlFiles = result.blobs.filter(b => b.pathname.endsWith('.html') && b.pathname.startsWith('NSIB_'));
      allHtmlFiles.push(...htmlFiles.map(b => ({ pathname: b.pathname, url: b.url, uploadedAt: b.uploadedAt })));
      cursor = result.cursor;
    } while (cursor);

    const newFiles = allHtmlFiles.filter(file => !existingUrls.has(file.url));

    const newEntries: HistoryItem[] = newFiles.map(file => {
      const filename = file.pathname.replace('.html', '');
      const parts = filename.split('_');
      const customerName = parts[1] || 'Unknown';
      const make = parts[2] || '';
      const model = parts[3] || '';
      const vehicle = `${make} ${model}`.trim() || 'Unknown Vehicle';
      const referenceNumber = parts[parts.length - 1] || '';

      return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        date: file.uploadedAt.toISOString(),
        vehicle,
        customerName,
        referenceNumber,
        fileUrl: file.url,
      };
    });

    return NextResponse.json({
      success: true,
      stats: { totalScanned, totalHtmlFiles: allHtmlFiles.length, existingCount: existingHistory.length, newFilesFound: newFiles.length },
      preview: newEntries.slice(0, 5),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) });
  }
}

export async function POST() {
  try {
    let existingHistory: HistoryItem[] = [];
    try {
      const response = await fetch(`${BLOB_BASE_URL}/${HISTORY_FILE}?t=${Date.now()}`);
      if (response.ok) existingHistory = await response.json();
    } catch { existingHistory = []; }

    const existingUrls = new Set(existingHistory.map(h => h.fileUrl).filter(Boolean));

    const allHtmlFiles: Array<{ pathname: string; url: string; uploadedAt: Date }> = [];
    let cursor: string | undefined;

    do {
      const result = await list({ cursor, limit: 1000 });
      const htmlFiles = result.blobs.filter(b => b.pathname.endsWith('.html') && b.pathname.startsWith('NSIB_'));
      allHtmlFiles.push(...htmlFiles.map(b => ({ pathname: b.pathname, url: b.url, uploadedAt: b.uploadedAt })));
      cursor = result.cursor;
    } while (cursor);

    const newFiles = allHtmlFiles.filter(file => !existingUrls.has(file.url));

    const newEntries: HistoryItem[] = newFiles.map(file => {
      const filename = file.pathname.replace('.html', '');
      const parts = filename.split('_');
      const customerName = parts[1] || 'Unknown';
      const make = parts[2] || '';
      const model = parts[3] || '';
      const vehicle = `${make} ${model}`.trim() || 'Unknown Vehicle';
      const referenceNumber = parts[parts.length - 1] || '';

      return {
  id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
  date: file.uploadedAt.toISOString(),
  vehicle,
  customerName,
  referenceNumber,
  fileUrl: file.url,
  quotes: [],
  businessType: 'Private',
};

    const allHistory = [...existingHistory, ...newEntries];
    allHistory.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

    await put(HISTORY_FILE, JSON.stringify(allHistory), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    return NextResponse.json({
      success: true,
      previousCount: existingHistory.length,
      newFilesAdded: newEntries.length,
      totalCount: allHistory.length,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}