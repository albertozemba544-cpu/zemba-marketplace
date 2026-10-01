import { supabase } from './db';
import { randomUUID } from 'crypto';

const allowedTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
]);

const BUCKET_NAME = 'product-uploads';

/**
 * Initialize the Supabase Storage bucket if it doesn't exist
 */
export async function initializeStorageBucket() {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return false;
    }

    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
    
    if (!bucketExists) {
      // Create bucket if it doesn't exist
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
      });

      if (createError) {
        console.error('Error creating bucket:', createError);
        return false;
      }

      console.log(`Storage bucket '${BUCKET_NAME}' created successfully`);
    }

    return true;
  } catch (error) {
    console.error('Error initializing storage:', error);
    return false;
  }
}

export async function saveUploadedImage(file: File): Promise<string> {
  const extension = allowedTypes.get(file.type);
  if (!extension) {
    throw new Error('Only JPEG and PNG images are allowed');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image must be 5 MB or smaller');
  }

  try {
    // Initialize bucket if needed
    await initializeStorageBucket();

    const filename = `${randomUUID()}${extension}`;
    const filePath = `products/${filename}`;

    const buffer = await file.arrayBuffer();
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw error;
    }

    // Get public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return publicUrlData?.publicUrl || `/storage/object/public/${BUCKET_NAME}/${filePath}`;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error(`Failed to upload image: ${error}`);
  }
}

export async function deleteUploadedImage(filePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting image:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
}
