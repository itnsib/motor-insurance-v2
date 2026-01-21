import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

const HISTORY_FILE = 'nsib-history.json';
const BLOB_BASE_URL = 'https://gwnpkxzk3ye0v7zh.public.blob.vercel-storage.com';

export async function GET() {
  const url = `${BLOB_BASE_URL}/${HISTORY_FILE}?t=${Date.now()}`;
  
  try {
    const response = await fetch(url);
    
    if (response.ok) {
      const history = await response.json();
      return NextResponse.json({ success: true, history });
    } else {
      return NextResponse.json({ success: true, history: [] });
    }
  } catch (error) {
    return NextResponse.json({ success: true, history: [] });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let newHistory;
    
    if (body.history) {
      newHistory = body.history;
    } else if (body.item) {
      let existingHistory: unknown[] = [];
      try {
        const url = `${BLOB_BASE_URL}/${HISTORY_FILE}?t=${Date.now()}`;
        const response = await fetch(url);
        if (response.ok) {
          existingHistory = await response.json();
        }
      } catch (e) {
        existingHistory = [];
      }
      newHistory = [body.item, ...existingHistory];
    } else {
      return NextResponse.json({ success: false, error: 'Missing history or item' }, { status: 400 });
    }

    await put(HISTORY_FILE, JSON.stringify(newHistory), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    return NextResponse.json({ success: true, count: newHistory.length });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    }

    let history: Array<{ id: string }> = [];
    try {
      const url = `${BLOB_BASE_URL}/${HISTORY_FILE}?t=${Date.now()}`;
      const response = await fetch(url);
      if (response.ok) {
        history = await response.json();
      }
    } catch (e) {
      history = [];
    }

    const updatedHistory = history.filter(item => item.id !== id);

    await put(HISTORY_FILE, JSON.stringify(updatedHistory), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}