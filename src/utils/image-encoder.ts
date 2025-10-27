/**
 * Image Encoding Utilities for Email Templates
 * Converts local images to base64 for reliable email delivery
 */

import fs from 'fs';
import path from 'path';

/**
 * Encode an image file to base64 data URI
 * @param imagePath - Relative or absolute path to image file
 * @returns Base64 encoded data URI string
 */
export const encodeImageToBase64 = (imagePath: string): string => {
  try {
    // Resolve the path relative to project root
    const resolvedPath = path.isAbsolute(imagePath)
      ? imagePath
      : path.join(process.cwd(), imagePath);

    // Read the image file
    const imageBuffer = fs.readFileSync(resolvedPath);
    
    // Convert to base64
    const base64Image = imageBuffer.toString('base64');
    
    // Determine MIME type from file extension
    const ext = path.extname(imagePath).toLowerCase();
    let mimeType = 'image/png';
    
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        mimeType = 'image/jpeg';
        break;
      case '.png':
        mimeType = 'image/png';
        break;
      case '.gif':
        mimeType = 'image/gif';
        break;
      case '.svg':
        mimeType = 'image/svg+xml';
        break;
      case '.webp':
        mimeType = 'image/webp';
        break;
      default:
        mimeType = 'image/png';
    }
    
    // Return data URI
    return `data:${mimeType};base64,${base64Image}`;
  } catch (error) {
    console.error('Error encoding image:', error);
    throw new Error(`Failed to encode image: ${imagePath}`);
  }
};

/**
 * Cache for encoded images to avoid re-encoding on every email
 */
const imageCache = new Map<string, string>();

/**
 * Get base64 encoded image with caching
 * @param imagePath - Path to image file
 * @returns Cached or newly encoded base64 data URI
 */
export const getCachedBase64Image = (imagePath: string): string => {
  if (imageCache.has(imagePath)) {
    return imageCache.get(imagePath)!;
  }
  
  const encoded = encodeImageToBase64(imagePath);
  imageCache.set(imagePath, encoded);
  return encoded;
};

/**
 * Clear the image cache (useful for development or when images change)
 */
export const clearImageCache = (): void => {
  imageCache.clear();
};

/**
 * Preload and cache email images on application startup
 * @param imagePaths - Array of image paths to preload
 */
export const preloadEmailImages = (imagePaths: string[]): void => {
  imagePaths.forEach((imagePath) => {
    try {
      getCachedBase64Image(imagePath);
      console.log(`✓ Preloaded email image: ${imagePath}`);
    } catch (error) {
      console.warn(`✗ Failed to preload image: ${imagePath}`, error);
    }
  });
};

