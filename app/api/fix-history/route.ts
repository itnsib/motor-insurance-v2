import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

const HISTORY_FILE = 'nsib-history.json';
const BLOB_BASE_URL = 'https://gwnpkxzk3ye0v7zh.public.blob.vercel-storage.com';

// This API will fix all history records to have required fields
export async function POST() {
  try {
    // Fetch current history
    const response = await fetch(BLOB_BASE_URL + '/' + HISTORY_FILE + '?t=' + Date.now());
    
    if (!response.ok) {
      return NextResponse.json({ success: false, error: 'Could not fetch history' });
    }
    
    const history = await response.json();
    
    // Fix each record to ensure it has all required fields
    const fixedHistory = history.map((item: Record<string, unknown>) => ({
      ...item,
      quotes: item.quotes || [],
      businessType: item.businessType || 'Private',
      vehicle: item.vehicle || 'Unknown Vehicle',
      customerName: item.customerName || 'Unknown',
      date: item.date || new Date().toISOString(),
      id: item.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
    }));
    
    // Save fixed history
    await put(HISTORY_FILE, JSON.stringify(fixedHistory), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    
    return NextResponse.json({
      success: true,
      message: 'All history records have been fixed',
      totalRecords: fixedHistory.length,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Use POST to fix all history records with missing quotes array',
    usage: 'fetch("/api/fix-history", { method: "POST" }).then(r => r.json()).then(console.log)'
  });
}