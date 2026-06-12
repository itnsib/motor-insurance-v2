import { put, list, del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

const HISTORY_FILE = 'quotes-history-shared.json';

// Helper to get the current history
async function getHistory(): Promise<any[]> {
  try {
    const { blobs } = await list({ prefix: HISTORY_FILE });
    if (blobs.length === 0) return [];
    
    const response = await fetch(blobs[0].url);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching history:', error);
    return [];
  }
}

// Helper to save history
async function saveHistory(history: any[]): Promise<string> {
  const blob = await put(HISTORY_FILE, JSON.stringify(history), {
    access: 'public',
    addRandomSuffix: false,
  });
  return blob.url;
}

export async function GET(request: NextRequest) {
  try {
    const history = await getHistory();
    return NextResponse.json({ success: true, history });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch history' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { item } = await request.json();
    
    if (!item || !item.referenceNumber) {
      return NextResponse.json({ success: false, error: 'Invalid item - missing referenceNumber' }, { status: 400 });
    }
    
    let history = await getHistory();
    
    // CRITICAL FIX: Find existing entry by REFERENCE NUMBER (most reliable identifier)
    const existingIndex = history.findIndex(
      (h: any) => h.referenceNumber === item.referenceNumber
    );
    
    if (existingIndex !== -1) {
      // UPDATE existing entry - preserve fileUrl if new item doesn't have one
      if (!item.fileUrl && history[existingIndex].fileUrl) {
        item.fileUrl = history[existingIndex].fileUrl;
      }
      history[existingIndex] = item;
      console.log(`Updated existing entry at index ${existingIndex} for ref: ${item.referenceNumber}`);
    } else {
      // ADD new entry at beginning
      history.unshift(item);
      console.log(`Added new entry for ref: ${item.referenceNumber}`);
    }
    
    await saveHistory(history);
    
    return NextResponse.json({ success: true, updated: existingIndex !== -1 });
  } catch (error) {
    console.error('POST error:', error);
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
      history = history.filter((h: any) => h.referenceNumber !== refNum);
    } else {
      history = history.filter((h: any) => h.id !== id);
    }
    
    await saveHistory(history);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
  }
}
