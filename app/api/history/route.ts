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
}

// Helper to get the current history
async function getHistory(): Promise<SavedComparison[]> {
  try {
    const { blobs } = await list({ prefix: HISTORY_FILE });
    if (blobs.length === 0) return [];
    
    const response = await fetch(blobs[0].url);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// Helper to save history
async function saveHistory(history: SavedComparison[]): Promise<string> {
  const blob = await put(HISTORY_FILE, JSON.stringify(history), {
    access: 'public',
    addRandomSuffix: false,
  });
  return blob.url;
}

export async function GET() {
  try {
    const history = await getHistory();
    return NextResponse.json({ success: true, history });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch history' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { item } = await request.json() as { item: SavedComparison };
    
    if (!item || !item.referenceNumber) {
      return NextResponse.json({ success: false, error: 'Invalid item - missing referenceNumber' }, { status: 400 });
    }
    
    const history = await getHistory();
    
    // CRITICAL FIX: Find existing entry by REFERENCE NUMBER
    const existingIndex = history.findIndex(
      (h: SavedComparison) => h.referenceNumber === item.referenceNumber
    );
    
    if (existingIndex !== -1) {
      // UPDATE existing entry - preserve fileUrl if new item doesn't have one
      if (!item.fileUrl && history[existingIndex].fileUrl) {
        item.fileUrl = history[existingIndex].fileUrl;
      }
      history[existingIndex] = item;
    } else {
      // ADD new entry at beginning
      history.unshift(item);
    }
    
    await saveHistory(history);
    
    return NextResponse.json({ success: true, updated: existingIndex !== -1 });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to save' }, { status: 500 });
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
    
    // Delete by ID or reference number
    if (refNum) {
      history = history.filter((h: SavedComparison) => h.referenceNumber !== refNum);
    } else {
      history = history.filter((h: SavedComparison) => h.id !== id);
    }
    
    await saveHistory(history);
    
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
  }
}
