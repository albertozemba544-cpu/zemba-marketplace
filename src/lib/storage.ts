import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const allowedTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
]);

export async function saveUploadedImage(file: File): Promise<string> {
  const extension = allowedTypes.get(file.type);
  if (!extension) throw new Error('Only JPEG and PNG images are allowed');
  if (file.size > 5 * 1024 * 1024) throw new Error('Image must be 5 MB or smaller');

  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadDir, { recursive: true });
  const filename = `${randomUUID()}${extension}`;
  await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${filename}`;
}
