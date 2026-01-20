import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { fileName, htmlContent } = await request.json();

    if (!fileName || !htmlContent) {
      return NextResponse.json(
        { success: false, error: 'Missing fileName or htmlContent' },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob Storage
    const blob = await put(fileName, htmlContent, {
      access: 'public',
      contentType: 'text/html',
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
      downloadUrl: blob.downloadUrl,
    });
  } catch (error) {
    console.error('Vercel Blob upload error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
