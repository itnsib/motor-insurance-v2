import { put, list } from '@vercel/blob';
import { NextResponse } from 'next/server';

// SHARED history file - all users see the same data
const HISTORY_FILE = 'nsib-shared-history.json';

// Helper function to find blob with pagination
async function findHistoryBlob() {
  let cursor: string | undefined;
  
  do {
    const result = await list({ cursor, limit: 1000 });
    const historyBlob = result.blobs.find(blob => blob.pathname === HISTORY_FILE);
    
    if (historyBlob) {
      return historyBlob;
    }
    
    cursor = result.cursor;
  } while (cursor);
  
  return null;
}

// GET - Fetch shared history
export async function GET() {
  try {
    // Try direct URL first (faster)
    const directUrl = `https://gwnpkxzk3ye0v7zh.public.blob.vercel-storage.com/${HISTORY_FILE}`;
    
    try {
      const response = await fetch(directUrl + '?t=' + Date.now());
      if (response.ok) {
        const history = await response.json();
        return NextResponse.json({ success: true, history });
      }
    } catch {
      // Direct URL failed, try list method
    }
    
    // Fallback: Search through blobs with pagination
    const historyBlob = await findHistoryBlob();
    
    if (historyBlob) {
      const response = await fetch(historyBlob.url + '?t=' + Date.now());
      const history = await response.json();
      return NextResponse.json({ success: true, history });
    } else {
      return NextResponse.json({ success: true, history: [] });
    }
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json({ success: true, history: [] });
  }
}

// POST - Save to shared history
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    let newHistory;
    
    if (body.history) {
      // Full history replacement
      newHistory = body.history;
    } else if (body.item) {
      // Single item addition - fetch existing and append
      let existingHistory: unknown[] = [];
      
      // Try direct URL first
      const directUrl = `https://gwnpkxzk3ye0v7zh.public.blob.vercel-storage.com/${HISTORY_FILE}`;
      try {
        const response = await fetch(directUrl + '?t=' + Date.now());
        if (response.ok) {
          existingHistory = await response.json();
        }
      } catch {
        // Try list method as fallback
        const historyBlob = await findHistoryBlob();
        if (historyBlob) {
          const response = await fetch(historyBlob.url + '?t=' + Date.now());
          existingHistory = await response.json();
        }
      }
      
      // Add new item at the beginning
      newHistory = [body.item, ...existingHistory];
    } else {
      return NextResponse.json(
        { success: false, error: 'Missing history or item' },
        { status: 400 }
      );
    }

    const blob = await put(HISTORY_FILE, JSON.stringify(newHistory), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    return NextResponse.json({ success: true, url: blob.url, count: newHistory.length });
  } catch (error) {
    console.error('Error saving history:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Save failed' },
      { status: 500 }
    );
  }
}

// DELETE - Remove item from shared history
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing id parameter' },
        { status: 400 }
      );
    }

    // Fetch current history
    let history: Array<{ id: string }> = [];
    
    const directUrl = `https://gwnpkxzk3ye0v7zh.public.blob.vercel-storage.com/${HISTORY_FILE}`;
    try {
      const response = await fetch(directUrl + '?t=' + Date.now());
      if (response.ok) {
        history = await response.json();
      }
    } catch {
      const historyBlob = await findHistoryBlob();
      if (historyBlob) {
        const response = await fetch(historyBlob.url + '?t=' + Date.now());
        history = await response.json();
      }
    }

    // Remove the item
    const updatedHistory = history.filter(item => item.id !== id);

    // Save updated history
    await put(HISTORY_FILE, JSON.stringify(updatedHistory), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting from history:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    );
  }
}