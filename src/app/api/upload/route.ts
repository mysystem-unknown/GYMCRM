import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { requireAuth } from '@/lib/auth';

// Force Node.js runtime
export const runtime = 'nodejs';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

async function ensureUploadDir(): Promise<void> {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

function getExt(mimeType: string): string {
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  return '.jpg';
}

export async function POST(request: NextRequest) {
  try {
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    await ensureUploadDir();

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    const memberId = formData.get('memberId') as string | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPG, PNG, and WEBP allowed.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 5MB).' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = getExt(file.type);
    const ts = Date.now();
    const rand = Math.random().toString(36).substring(2, 8);
    const filename = memberId ? `${memberId}_${ts}_${rand}${ext}` : `${ts}_${rand}${ext}`;

    await writeFile(path.join(UPLOAD_DIR, filename), buffer);

    return NextResponse.json({ success: true, imageUrl: `/uploads/${filename}`, filename, size: buffer.length });
  } catch (err) {
    console.error('[upload] POST error:', err);
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const imageUrl = searchParams.get('imageUrl');

    if (!memberId && !imageUrl) {
      return NextResponse.json({ error: 'Provide memberId or imageUrl.' }, { status: 400 });
    }

    await ensureUploadDir();
    let deleted = false;

    if (imageUrl) {
      const fn = imageUrl.startsWith('/uploads/') ? imageUrl.slice(9) : imageUrl;
      try { await unlink(path.join(UPLOAD_DIR, fn)); deleted = true; } catch {}
    } else if (memberId) {
      const files = await readdir(UPLOAD_DIR);
      for (const f of files) {
        if (f.startsWith(`${memberId}_`)) {
          try { await unlink(path.join(UPLOAD_DIR, f)); deleted = true; } catch {}
        }
      }
    }

    return NextResponse.json({ success: true, deleted });
  } catch (err) {
    console.error('[upload] DELETE error:', err);
    return NextResponse.json({ error: 'Delete failed.' }, { status: 500 });
  }
}
