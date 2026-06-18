import { BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

export const AVATAR_MAX_BYTES = 3 * 1024 * 1024;

export interface AvatarUploadFile {
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function extensionForMime(mimetype: string): string {
  const ext = MIME_TO_EXT[mimetype];
  if (!ext) {
    throw new BadRequestException(
      'Invalid file type. Allowed: JPEG, PNG, WebP.',
    );
  }
  return ext;
}

export function avatarsDir(): string {
  return join(process.cwd(), 'uploads', 'avatars');
}

export function ensureAvatarsDir(): void {
  const dir = avatarsDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function avatarDiskPath(masterId: string, ext: string): string {
  return join(avatarsDir(), `${masterId}.${ext}`);
}

export function buildAvatarUrl(masterId: string, ext: string): string {
  return `/uploads/avatars/${masterId}.${ext}?v=${Date.now()}`;
}

export function parseAvatarPathFromUrl(
  avatarUrl: string | null | undefined,
): { masterId: string; ext: string } | null {
  if (!avatarUrl) return null;
  const pathPart = avatarUrl.split('?')[0];
  const match = pathPart.match(/\/uploads\/avatars\/([^/]+)\.(\w+)$/);
  if (!match) return null;
  return { masterId: match[1], ext: match[2] };
}

export function deleteAvatarFileIfExists(masterId: string, ext: string): void {
  const diskPath = avatarDiskPath(masterId, ext);
  if (existsSync(diskPath)) {
    unlinkSync(diskPath);
  }
}

export function validateAvatarUpload(
  file: AvatarUploadFile | undefined,
): AvatarUploadFile {
  if (!file || !file.buffer?.length) {
    throw new BadRequestException('No file uploaded.');
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new BadRequestException('File exceeds 3 MB limit.');
  }
  extensionForMime(file.mimetype);
  return file;
}

export function writeAvatarFile(
  masterId: string,
  ext: string,
  buffer: Buffer,
): void {
  ensureAvatarsDir();
  writeFileSync(avatarDiskPath(masterId, ext), buffer);
}
