import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { db } from '@/lib/db';
import crypto from 'crypto';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'member-photos');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

function generateFilename(originalName: string): string {
  const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  const uniqueId = crypto.randomBytes(16).toString('hex');
  return `${uniqueId}.${ext}`;
}

// POST - Upload member profile image
export async function POST(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const memberId = formData.get('memberId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPG, PNG, and WEBP are allowed.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit.' },
        { status: 400 }
      );
    }

    const member = await db.member.findUnique({ where: { id: memberId } });
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (user.role !== 'super_admin' && member.gymId !== user.gymId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete old photo if exists
    if (member.profileImageUrl) {
      const oldPath = join(process.cwd(), 'public', member.profileImageUrl);
      if (existsSync(oldPath)) {
        try { await unlink(oldPath); } catch { /* ignore */ }
      }
    }

    await ensureUploadDir();

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = generateFilename(file.name);
    const filepath = join(UPLOAD_DIR, filename);

    await writeFile(filepath, buffer);

    const imageUrl = `/uploads/member-photos/${filename}`;

    await db.member.update({
      where: { id: memberId },
      data: { profileImageUrl: imageUrl },
    });

    return NextResponse.json({ success: true, url: imageUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}

// DELETE - Remove member profile image
export async function DELETE(request: NextRequest) {
  try {
    const { error, user } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    const member = await db.member.findUnique({ where: { id: memberId } });
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (user.role !== 'super_admin' && member.gymId !== user.gymId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (member.profileImageUrl) {
      const filepath = join(process.cwd(), 'public', member.profileImageUrl);
      if (existsSync(filepath)) {
        try { await unlink(filepath); } catch { /* ignore */ }
      }
      await db.member.update({
        where: { id: memberId },
        data: { profileImageUrl: '' },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete image error:', error);
    return NextResponse.json({ error: 'Failed to remove image' }, { status: 500 });
  }
}
