import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

// SHARED history file - all users see the same data
const HISTORY_FILE = 'nsib-history.json';
const BLOB_BASE_URL = 'https://gwnpkxzk3ye0v7zh.public.blob.vercel-storage.com';

// GET - Fetch shared history
export async function GET() {
  try {
    const url = `${BLOB_BASE_URL}/${HISTORY_FILE}?t=${Date.now()}`;
    
    const response = await fetch(url);
    
    if (response.ok) {
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
      
      try {
        const url = `${BLOB_BASE_URL}/${HISTORY_FILE}?t=${Date.now()}`;
        const response = await fetch(url);
        if (response.ok) {
          existingHistory = await response.json();
        }
      } catch (e) {
        console.error('Error fetching existing history:', e);
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
      allowOverwrite: true,
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
    
    try {
      const url = `${BLOB_BASE_URL}/${HISTORY_FILE}?t=${Date.now()}`;
      const response = await fetch(url);
      if (response.ok) {
        history = await response.json();
      }
    } catch (e) {
      console.error('Error fetching history for delete:', e);
    }

    // Remove the item
    const updatedHistory = history.filter(item => item.id !== id);

    // Save updated history
    await put(HISTORY_FILE, JSON.stringify(updatedHistory), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
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