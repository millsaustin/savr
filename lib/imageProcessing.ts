// imageProcessing.ts - Node.js version with sharp for actual image processing
// Use this in a separate processing service or serverless function that supports Node.js

import sharp from 'sharp';
import crypto from 'crypto';

/////////////////////////////
// IMAGE PROCESSING
/////////////////////////////

/**
 * Post-process an image buffer using sharp
 * - Crops to square (centered)
 * - Resizes to minimum 1024x1024
 * - Applies mild tone normalization (contrast/brightness)
 */
export async function postProcess(buffer: Buffer): Promise<Buffer> {
  try {
    console.log('[postProcess] Starting image processing...');

    // Get image metadata
    const image = sharp(buffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error('Could not read image dimensions');
    }

    console.log(`[postProcess] Input: ${metadata.width}x${metadata.height} ${metadata.format}`);

    // Calculate crop dimensions for center square
    const minDim = Math.min(metadata.width, metadata.height);
    const cropX = Math.floor((metadata.width - minDim) / 2);
    const cropY = Math.floor((metadata.height - minDim) / 2);

    // Process the image
    const processed = await sharp(buffer)
      // Extract center square
      .extract({
        left: cropX,
        top: cropY,
        width: minDim,
        height: minDim,
      })
      // Resize to at least 1024x1024 (upscale if needed)
      .resize(Math.max(1024, minDim), Math.max(1024, minDim), {
        kernel: 'lanczos3',
        fit: 'cover',
      })
      // Apply mild tone normalization
      .normalize({
        lower: 5,  // Darken shadows slightly
        upper: 95, // Brighten highlights slightly
      })
      // Enhance saturation slightly for food photos
      .modulate({
        saturation: 1.1, // 10% saturation boost
        brightness: 1.05, // 5% brightness boost
      })
      // Sharpen slightly for better detail
      .sharpen({
        sigma: 0.5,
        m1: 0.5,
        m2: 0.5,
      })
      // Convert to PNG with optimization
      .png({
        quality: 90,
        compressionLevel: 9,
        adaptiveFiltering: true,
      })
      .toBuffer();

    console.log(`[postProcess] Output: ${processed.length} bytes`);

    return processed;
  } catch (error) {
    console.error('[postProcess] Error processing image:', error);
    // Return original buffer if processing fails
    return buffer;
  }
}

/**
 * Calculate SHA-256 hash of a buffer
 */
export function sha256(buffer: Buffer): string {
  const hash = crypto.createHash('sha256');
  hash.update(buffer);
  return hash.digest('hex');
}

/**
 * Validate image buffer
 * Checks that it's a valid image and meets minimum requirements
 */
export async function validateImage(buffer: Buffer): Promise<{
  valid: boolean;
  width?: number;
  height?: number;
  format?: string;
  size?: number;
  error?: string;
}> {
  try {
    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || !metadata.height) {
      return { valid: false, error: 'Could not read image dimensions' };
    }

    // Check minimum dimensions
    if (metadata.width < 512 || metadata.height < 512) {
      return {
        valid: false,
        width: metadata.width,
        height: metadata.height,
        error: 'Image too small (minimum 512x512)'
      };
    }

    // Check file size (not too small, not ridiculously large)
    if (buffer.length < 10_000) {
      return { valid: false, error: 'File size too small (minimum 10KB)' };
    }

    if (buffer.length > 50_000_000) {
      return { valid: false, size: buffer.length, error: 'File size too large (maximum 50MB)' };
    }

    return {
      valid: true,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: buffer.length,
    };
  } catch (error) {
    return { valid: false, error: `Invalid image: ${error}` };
  }
}

/**
 * Generate thumbnail from image buffer
 */
export async function generateThumbnail(
  buffer: Buffer,
  size: number = 256
): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .resize(size, size, {
        kernel: 'lanczos3',
        fit: 'cover',
      })
      .png({ quality: 80 })
      .toBuffer();
  } catch (error) {
    console.error('[generateThumbnail] Error:', error);
    throw error;
  }
}

/**
 * Convert image to WebP format for better compression
 */
export async function convertToWebP(
  buffer: Buffer,
  quality: number = 85
): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .webp({ quality })
      .toBuffer();
  } catch (error) {
    console.error('[convertToWebP] Error:', error);
    throw error;
  }
}

/**
 * Batch process multiple images
 */
export async function batchProcess(
  buffers: Buffer[]
): Promise<{ processed: Buffer[]; errors: Error[] }> {
  const processed: Buffer[] = [];
  const errors: Error[] = [];

  for (const buffer of buffers) {
    try {
      const result = await postProcess(buffer);
      processed.push(result);
    } catch (error) {
      errors.push(error as Error);
      processed.push(buffer); // Use original if processing fails
    }
  }

  return { processed, errors };
}
