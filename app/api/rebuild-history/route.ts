import { list, put } from '@vercel/blob';
import { NextResponse } from 'next/server';

const HISTORY_FILE = 'nsib-history.json';
const BLOB_BASE_URL = 'https://gwnpkxzk3ye0v7zh.public.blob.vercel-storage.com';

// This API will scan all HTML files in Blob storage and rebuild the history
export async function GET() {
  try {
    // Get existing history first
    let existingHistory: Array<{ id: string; fileUrl?: string }> = [];
    try {
      const response = await fetch(`${BLOB_BASE_URL}/${HISTORY_FILE}?t=${Date.now()}`);
      if (response.ok) {
        existingHistory = await response.json();
      }
    } catch (e) {
      existingHistory = [];
    }

    // Get all existing file URLs from history
    const existingUrls = new Set(existingHistory.map(h => h.fileUrl).filter(Boolean));

    // List all blobs with pagination
    const allHtmlFiles: Array<{
      pathname: string;
      url: string;
      uploadedAt: Date;
    }> = [];

    let cursor: string | undefined;
    let totalScanned = 0;

    do {
      const result = await list({ cursor, limit: 1000 });
      totalScanned += result.blobs.length;

      // Filter HTML files that are NSIB comparisons
      const htmlFiles = result.blobs.filter(
        blob => blob.pathname.endsWith('.html') && blob.pathname.startsWith('NSIB_')
      );

      allHtmlFiles.push(...htmlFiles.map(blob => ({
        pathname: blob.pathname,
        url: blob.url,
        uploadedAt: blob.uploadedAt,
      })));

      cursor = result.cursor;
    } while (cursor);

    // Find HTML files not in history
    const newFiles = allHtmlFiles.filter(file => !existingUrls.has(file.url));

    // Create history entries for new files
    const newHistoryEntries = newFiles.map(file => {
      // Parse filename: NSIB_CustomerName_Make_Model_RefNumber.html
      const filename = file.pathname.replace('.html', '');
      const parts = filename.split('_');
      
      // Extract info from filename
      let customerName = 'Unknown';
      let vehicle = 'Unknown Vehicle';
      let referenceNumber = '';

      if (parts.length >= 4) {
        // NSIB_CustomerName_Make_Model_RefNumber
        customerName = parts[1] || 'Unknown';
        const make = parts[2] || '';
        const model = parts[3] || '';
        vehicle = `${make} ${model}`.trim() || 'Unknown Vehicle';
        referenceNumber = parts[parts.length - 1] || '';
      }

      return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        date: file.uploadedAt.toISOString(),
        vehicle: vehicle,
        customerName: customerName,
        referenceNumber: referenceNumber,
        fileUrl: file.url,
        quotes: [], // We don't have the original quotes data
        recoveredFromBlob: true, // Mark as recovered
      };
    });

    // Combine existing history with new entries (new at the end, sorted by date)
    const allHistory = [...existingHistory];
    
    // Add new entries
    newHistoryEntries.forEach(entry => {
      allHistory.push(entry);
    });

    // Sort by date (newest first)
    allHistory.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({
      success: true,
      message: 'Scan complete',
      stats: {
        totalBlobsScanned: totalScanned,
        totalHtmlFiles: allHtmlFiles.length,
        existingHistoryCount: existingHistory.length,
        newFilesFound: newFiles.length,
        finalHistoryCount: allHistory.length,
      },
      newFiles: newHistoryEntries.slice(0, 10), // Preview first 10 new files
      // Uncomment below to see all
      // allHistory: allHistory,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error),
    });
  }
}

// POST - Actually save the rebuilt history
export async function POST() {
  try {
    // Get existing history
    let existingHistory: Array<{ id: string; fileUrl?: string }> = [];
    try {
      const response = await fetch(`${BLOB_BASE_URL}/${HISTORY_FILE}?t=${Date.now()}`);
      if (response.ok) {
        existingHistory = await response.json();
      }
    } catch (e) {
      existingHistory = [];
    }

    const existingUrls = new Set(existingHistory.map(h => h.fileUrl).filter(Boolean));

    // List all HTML files
    const allHtmlFiles: Array<{
      pathname: string;
      url: string;
      uploadedAt: Date;
    }> = [];

    let cursor: string | undefined;

    do {
      const result = await list({ cursor, limit: 1000 });
      const htmlFiles = result.blobs.filter(
        blob => blob.pathname.endsWith('.html') && blob.pathname.startsWith('NSIB_')
      );
      allHtmlFiles.push(...htmlFiles.map(blob => ({
        pathname: blob.pathname,
        url: blob.url,
        uploadedAt: blob.uploadedAt,
      })));
      cursor = result.cursor;
    } while (cursor);

    // Find new files
    const newFiles = allHtmlFiles.filter(file => !existingUrls.has(file.url));

    // Create entries for new files
    const newEntries = newFiles.map(file => {
      const filename = file.pathname.replace('.html', '');
      const parts = filename.split('_');
      
      let customerName = 'Unknown';
      let vehicle = 'Unknown Vehicle';
      let referenceNumber = '';

      if (parts.length >= 4) {
        customerName = parts[1] || 'Unknown';
        const make = parts[2] || '';
        const model = parts[3] || '';
        vehicle = `${make} ${model}`.trim() || 'Unknown Vehicle';
        referenceNumber = parts[parts.length - 1] || '';
      }

      return {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        date: file.uploadedAt.toISOString(),
        vehicle: vehicle,
        customerName: customerName,
        referenceNumber: referenceNumber,
        fileUrl: file.url,
        quotes: [],
        recoveredFromBlob: true,
      };
    });

    // Combine and sort
    const allHistory = [...existingHistory, ...newEntries];
    allHistory.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA;
    });

    // Save to Blob
    await put(HISTORY_FILE, JSON.stringify(allHistory), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    return NextResponse.json({
      success: true,
      message: 'History rebuilt successfully!',
      previousCount: existingHistory.length,
      newFilesAdded: newEntries.length,
      totalCount: allHistory.length,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error),
    }, { status: 500 });
  }
}