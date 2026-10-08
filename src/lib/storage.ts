// Image uploads go to Supabase Storage (Vercel's disk is read-only).

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const BUCKET = 'zemba-uploads';
// Vercel rejects request bodies over about 4.5 MB in total, so keep each photo small.
const MAX_BYTES = 4 * 1024 * 1024;

let client: SupabaseClient | null = null;

function supabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Image storage is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
  if (!client) client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export async function saveUploadedImage(file: File, folder: 'products' | 'dispatch' = 'products'): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error('Each photo must be 4 MB or smaller');
  const bytes = Buffer.from(await file.arrayBuffer());

  const isJpeg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng =
    bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (!isJpeg && !isPng) throw new Error('Only JPEG and PNG images are allowed');

  const path = `${folder}/${randomUUID()}${isPng ? '.png' : '.jpg'}`;
  const sb = supabase();
  const { error } = await sb.storage.from(BUCKET).upload(path, bytes, {
    contentType: isPng ? 'image/png' : 'image/jpeg',
    upsert: false,
  });
  if (error) {
    console.error('Supabase upload failed:', error);
    throw new Error('Could not upload the image. Please try again.');
  }
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Deletes a product photo from storage. Never throws - a leftover file is harmless. */
export async function removeUploadedImage(url: string): Promise<void> {
  try {
    const marker = `/${BUCKET}/`;
    const index = url.indexOf(marker);
    if (index === -1) return;
    await supabase().storage.from(BUCKET).remove([url.slice(index + marker.length)]);
  } catch (error) {
    console.error('Could not delete image from storage:', error);
  }
}

// ---- Private photos (seller ID checks). These are never public: only signed, short-lived links open them. ----
const PRIVATE_BUCKET = 'zemba-private';

export async function savePrivateImage(file: File, folder: string): Promise<string> {
  if (file.size > MAX_BYTES) throw new Error('Each photo must be 4 MB or smaller');
  const bytes = Buffer.from(await file.arrayBuffer());
  const isJpeg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (!isJpeg && !isPng) throw new Error('Only JPEG and PNG photos are allowed');
  const path = `${folder}/${randomUUID()}${isPng ? '.png' : '.jpg'}`;
  const { error } = await supabase().storage.from(PRIVATE_BUCKET).upload(path, bytes, { contentType: isPng ? 'image/png' : 'image/jpeg', upsert: false });
  if (error) {
    console.error('Private upload failed:', error);
    throw new Error('Could not upload the photo. Please try again.');
  }
  return path;
}

/** A link that opens a private photo for a few minutes. */
export async function signedPrivateUrl(path: string | null | undefined, seconds = 300): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase().storage.from(PRIVATE_BUCKET).createSignedUrl(path, seconds);
  if (error) {
    console.error('Could not sign private photo link:', error);
    return null;
  }
  return data.signedUrl;
}

export async function removePrivateImage(path: string | null | undefined): Promise<void> {
  if (!path) return;
  try {
    await supabase().storage.from(PRIVATE_BUCKET).remove([path]);
  } catch (error) {
    console.error('Could not delete private photo:', error);
  }
}
