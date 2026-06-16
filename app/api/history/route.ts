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

// Helper to get the current history - TRY MULTIPLE FILE NAMES
async function getHistory(): Promise<SavedComparison[]> {
  try {
    // First, list ALL blobs to see what files exist
    const { blobs } = await list();
    
    // Log all blob names for debugging
    console.log('All blobs found:', blobs.map(b => b.pathname));
    
    // Try to find history file with different possible names
    const possibleNames = [
      'quotes-history-shared.json',
      'quotes-history.json', 
      'history.json',
      'quotesHistory.json'
    ];
    
    for (const name of possibleNames) {
      const historyBlob = blobs.find(b => b.pathname === name || b.pathname.includes(name));
      if (historyBlob) {
        console.log('Found history at:', historyBlob.pathname);
        const response = await fetch(historyBlob.url);
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          console.log('Loaded', data.length, 'items from', historyBlob.pathname);
          return data;
        }
      }
    }
    
    // If no named file found, try any JSON file that might contain history
    for (const blob of blobs) {
      if (blob.pathname.endsWith('.json') && !blob.pathname.includes('NSIB_')) {
        try {
          const response = await fetch(blob.url);
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0 && data[0].referenceNumber) {
            console.log('Found history data in:', blob.pathname, 'with', data.length, 'items');
            return data;
          }
        } catch {
          // Not a valid JSON or not history data
        }
      }
    }
    
    return [];
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const debug = searchParams.get('debug');
    
    // Debug mode - list all blobs
    if (debug === 'true') {
      const { blobs } = await list();
      return NextResponse.json({ 
        success: true, 
        blobs: blobs.map(b => ({ 
          name: b.pathname, 
          url: b.url,
          size: b.size 
        }))
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
    const { item } = await request.json() as { item: SavedComparison };
    
    if (!item || !item.referenceNumber) {
      return NextResponse.json({ success: false, error: 'Invalid item - missing referenceNumber' }, { status: 400 });
    }
    
    const history = await getHistory();
    
    // Find existing entry by REFERENCE NUMBER
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
