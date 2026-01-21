import { list } from '@vercel/blob';
import { NextResponse } from 'next/server';

// Debug endpoint to see all blobs and their contents
export async function GET() {
  try {
    const { blobs } = await list();
    
    const blobDetails = await Promise.all(
      blobs.map(async (blob) => {
        let content = null;
        if (blob.pathname.endsWith('.json')) {
          try {
            const response = await fetch(blob.url);
            content = await response.json();
          } catch {
            content = 'Could not parse JSON';
          }
        }
        return {
          pathname: blob.pathname,
          url: blob.url,
          size: blob.size,
          contentPreview: content ? (Array.isArray(content) ? `Array with ${content.length} items` : typeof content) : 'N/A'
        };
      })
    );
    
    // Find history file specifically
    const historyBlob = blobs.find(blob => blob.pathname === 'nsib-shared-history.json');
    let historyContent = null;
    
    if (historyBlob) {
      try {
        const response = await fetch(historyBlob.url + '?t=' + Date.now());
        historyContent = await response.json();
      } catch (e) {
        historyContent = 'Error fetching: ' + String(e);
      }
    }
    
    return NextResponse.json({ 
      success: true,
      totalBlobs: blobs.length,
      allBlobs: blobDetails,
      historyFileFound: !!historyBlob,
      historyFileUrl: historyBlob?.url || 'NOT FOUND',
      historyContent: historyContent,
      historyItemCount: Array.isArray(historyContent) ? historyContent.length : 0
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}