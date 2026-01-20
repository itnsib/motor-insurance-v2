import { put, list } from '@vercel/blob';
import { NextResponse } from 'next/server';

// SHARED history file - all users see the same data
const HISTORY_FILE = 'nsib-shared-history.json';

// GET - Fetch shared history (all users see the same data)
export async function GET() {
  try {
    const { blobs } = await list();
    const historyBlob = blobs.find(blob => blob.pathname === HISTORY_FILE);
    
    if (historyBlob) {
      const response = await fetch(historyBlob.url);
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
    const { history } = await request.json();

    const blob = await put(HISTORY_FILE, JSON.stringify(history), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    return NextResponse.json({ success: true, url: blob.url });
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
    const { blobs } = await list();
    const historyBlob = blobs.find(blob => blob.pathname === HISTORY_FILE);
    
    let history: Array<{ id: string }> = [];
    if (historyBlob) {
      const response = await fetch(historyBlob.url);
      history = await response.json();
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