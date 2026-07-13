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

    // allowOverwrite is required: the filename is derived from the reference
    // number, so re-saving an edited comparison targets an existing pathname
    // and put() would otherwise throw.
    const blob = await put(fileName, htmlContent, {
      access: 'public',
      contentType: 'text/html',
      allowOverwrite: true,
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
