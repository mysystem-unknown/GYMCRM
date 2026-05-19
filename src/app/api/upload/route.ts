import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { requireAuth } from '@/lib/auth';

// Force Node.js runtime - required for fs/sharp, NOT edge-runtime
export const runtime = 'nodejs';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_DIMENSION = 1200;

function getExt(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg': return '.jpg';
    case 'image/png': return '.png';
    case 'image/webp': return '.webp';
    default: return '.jpg';
  }
}

async function ensureUploadDir(): Promise<void> {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

async function processWithSharp(buffer: Buffer, ext: string): Promise<Buffer> {
  try {
    const sharp = (await import('sharp')).default;
    let pipeline = sharp(buffer);

    const metadata = await pipeline.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    // Resize only if image exceeds max dimension
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      pipeline = pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Output in the same format with compression
    switch (ext) {
      case '.webp':
        return await pipeline.webp({ quality: 80 }).toBuffer();
      case '.png':
        return await pipeline.png({ compressionLevel: 8 }).toBuffer();
      default:
        return await pipeline.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    }
  } catch (err) {
    // If sharp fails for any reason, return original buffer
    console.error('[upload] sharp processing failed, using original buffer:', err);
    return buffer;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    // 2. Ensure upload directory exists
    await ensureUploadDir();

    // 3. Parse FormData natively (App Router built-in, no multer needed)
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: 'Invalid request. Must send FormData with a file.' },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File | null;
    const memberId = formData.get('memberId') as string | null;

    // 4. Validate file exists
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No file provided. Use FormData with key "file".' },
        { status: 400 }
      );
    }

    // 5. Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPG, PNG, and WEBP are allowed.' },
        { status: 400 }
      );
    }

    // 6. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit.' },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: 'Empty file received.' },
        { status: 400 }
      );
    }

    // 7. Convert to buffer
    const rawBuffer = Buffer.from(await file.arrayBuffer());

    // 8. Generate unique filename
    const ext = getExt(file.type);
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10);
    const filename = memberId
      ? `${memberId}_${timestamp}_${randomStr}${ext}`
      : `${timestamp}_${randomStr}${ext}`;

    // 9. Process with sharp (resize + compress)
    const processedBuffer = await processWithSharp(rawBuffer, ext);

    // 10. Write file to public/uploads/
    const filePath = path.join(UPLOAD_DIR, filename);
    await writeFile(filePath, processedBuffer);

    const imageUrl = `/uploads/${filename}`;
    console.log(`[upload] Saved: ${filename} (${(processedBuffer.length / 1024).toFixed(1)}KB)`);

    // 11. Return JSON response
    return NextResponse.json({
      success: true,
      imageUrl,
      filename,
      size: processedBuffer.length,
    });
  } catch (err) {
    console.error('[upload] POST error:', err);
    return NextResponse.json(
      { error: 'Upload failed. Please try again.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Auth check
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const imageUrl = searchParams.get('imageUrl');

    if (!memberId && !imageUrl) {
      return NextResponse.json(
        { error: 'Provide memberId or imageUrl to delete.' },
        { status: 400 }
      );
    }

    await ensureUploadDir();
    let deleted = false;

    if (imageUrl) {
      // Delete specific file by URL path
      const filename = imageUrl.startsWith('/uploads/')
        ? imageUrl.replace('/uploads/', '')
        : imageUrl;
      const filePath = path.join(UPLOAD_DIR, filename);
      try {
        await unlink(filePath);
        deleted = true;
        console.log(`[upload] Deleted: ${filename}`);
      } catch {
        console.warn(`[upload] File not found: ${filename}`);
      }
    } else if (memberId) {
      // Delete all files for this member (pattern: memberId_*)
      const files = await readdir(UPLOAD_DIR);
      for (const f of files) {
        if (f.startsWith(`${memberId}_`)) {
          try {
            await unlink(path.join(UPLOAD_DIR, f));
            deleted = true;
            console.log(`[upload] Deleted: ${f}`);
          } catch {
            // ignore individual file errors
          }
        }
      }
    }

    return NextResponse.json({ success: true, deleted });
  } catch (err) {
    console.error('[upload] DELETE error:', err);
    return NextResponse.json(
      { error: 'Failed to remove image.' },
      { status: 500 }
    );
  }
}
