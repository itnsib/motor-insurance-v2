import { NextResponse } from 'next/server';

export async function GET() {
  const url = 'https://gwnpkxzk3ye0v7zh.public.blob.vercel-storage.com/nsib-history.json';
  
  try {
    const response = await fetch(url);
    const status = response.status;
    const ok = response.ok;
    
    let data = null;
    let error = null;
    
    try {
      data = await response.json();
    } catch (e) {
      error = String(e);
    }
    
    return NextResponse.json({
      url,
      status,
      ok,
      dataLength: Array.isArray(data) ? data.length : 'not array',
      error,
      firstItem: Array.isArray(data) && data.length > 0 ? data[0].vehicle : null
    });
  } catch (e) {
    return NextResponse.json({
      url,
      fetchError: String(e)
    });
  }
}