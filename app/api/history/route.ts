import { put, head } from '@vercel/blob';
import { NextResponse } from 'next/server';

const HISTORY_FILE = 'nsib-history.json';

// GET - Fetch history
export async function GET() {
  try {
    const response = await fetch(`${process.env.BLOB_READ_WRITE_TOKEN}/${HISTORY_FILE}`);
    
    if (response.ok) {
      const history = await response.json();
      return NextResponse.json({ success: true, history });
    } else {
      // No history file exists yet
      return NextResponse.json({ success: true, history: [] });
    }
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json({ success: true, history: [] });
  }
}

// POST - Save history
export async function POST(request: Request) {
  try {
    const { history } = await request.json();

    const blob = await put(HISTORY_FILE, JSON.stringify(history), {
      access: 'public',
      contentType: 'application/json',
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
