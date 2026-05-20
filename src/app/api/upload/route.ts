import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// Force Node.js runtime (Cloudinary SDK requires Node)
export const runtime = 'nodejs';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const CLOUDINARY_FOLDER = 'gymcrm/profiles';

/**
 * Lazily initialise Cloudinary so the config is only loaded at request time
 * (avoids crashing at build time if env vars are missing).
 */
function getCloudinary() {
  const { v2 } = require('cloudinary');
  v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return v2;
}

export async function POST(request: NextRequest) {
  try {
    // --- Auth ---
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    // --- Parse multipart body ---
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
      return NextResponse.json({ error: 'Only JPG, PNG, WEBP, and GIF allowed.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 5 MB).' }, { status: 400 });
    }

    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required.' }, { status: 400 });
    }

    // --- Validate Cloudinary env vars ---
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('[upload] Missing Cloudinary env vars');
      return NextResponse.json({ error: 'Cloudinary is not configured. Contact admin.' }, { status: 500 });
    }

    // --- Convert File → base64 for Cloudinary upload_stream ---
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

    // --- Upload to Cloudinary ---
    const cloudinary = getCloudinary();

    // Use memberId as the public_id so each member has exactly one profile image.
    // overwrite:true means re-uploads replace the previous image.
    const publicId = `gymcrm/profiles/${memberId}`;

    const uploadResult = await new Promise<Record<string, unknown>>((resolve, reject) => {
      cloudinary.uploader.upload(
        base64,
        {
          public_id: publicId,
          folder: CLOUDINARY_FOLDER,
          overwrite: true,
          resource_type: 'image',
          transformation: [
            { width: 1200, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' },
          ],
        },
        (error: Error | undefined, result: Record<string, unknown>) => {
          if (error) return reject(error);
          resolve(result);
        },
      );
    });

    const secureUrl = uploadResult.secure_url as string;
    const returnedPublicId = uploadResult.public_id as string;
    const format = uploadResult.format as string;
    const bytes = uploadResult.bytes as number;

    if (!secureUrl) {
      console.error('[upload] Cloudinary returned no secure_url:', uploadResult);
      return NextResponse.json({ error: 'Upload succeeded but URL is missing.' }, { status: 500 });
    }

    console.log(`[upload] Uploaded ${bytes} bytes as ${returnedPublicId}`);

    return NextResponse.json({
      success: true,
      imageUrl: secureUrl,
      publicId: returnedPublicId,
      format,
      size: bytes,
    });
  } catch (err) {
    console.error('[upload] POST error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Upload failed.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // --- Auth ---
    const { error: authError } = await requireAuth();
    if (authError) return authError;

    // --- Validate Cloudinary env vars ---
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('[upload] Missing Cloudinary env vars');
      return NextResponse.json({ error: 'Cloudinary is not configured. Contact admin.' }, { status: 500 });
    }

    // --- Get memberId from query ---
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required.' }, { status: 400 });
    }

    // --- Delete from Cloudinary ---
    const cloudinary = getCloudinary();
    const publicId = `gymcrm/profiles/${memberId}`;

    const deleteResult = await new Promise<Record<string, unknown>>((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, { resource_type: 'image' }, (error: Error | undefined, result: Record<string, unknown>) => {
        if (error) return reject(error);
        resolve(result);
      });
    });

    const result = deleteResult.result as string; // 'ok' | 'not found'
    console.log(`[upload] Delete ${publicId}: ${result}`);

    return NextResponse.json({ success: true, deleted: result === 'ok', publicId });
  } catch (err) {
    console.error('[upload] DELETE error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Delete failed.' }, { status: 500 });
  }
}
