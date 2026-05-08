/**
 * Cloudinary configuration & upload helpers.
 *
 * The cloud name and unsigned upload preset are PUBLIC — they appear in
 * every uploaded image's URL anyway. Don't put your API secret here.
 *
 * Unsigned uploads let the browser upload directly to Cloudinary without
 * the request touching your backend. The unsigned preset (configured in
 * Cloudinary dashboard) defines what's allowed (image type, max size, etc).
 */

export const CLOUDINARY_CONFIG = {
  cloudName: 'combo',
  uploadPreset: 'smart_comboo_unsigned',
  folder: 'smartcombo',
};

export const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`;

export interface CloudinaryUploadResult {
  url: string;            // https://res.cloudinary.com/.../image/upload/.../filename.jpg
  publicId: string;       // smartcombo/abc123 — useful for deletion later
  width: number;
  height: number;
  bytes: number;
  format: string;         // 'jpg', 'png', 'webp', etc.
}

/**
 * Uploads a single file to Cloudinary using the unsigned preset.
 * Returns the secure URL + metadata.
 */
export async function uploadToCloudinary(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    if (CLOUDINARY_CONFIG.folder) {
      formData.append('folder', CLOUDINARY_CONFIG.folder);
    }

    const xhr = new XMLHttpRequest();
    xhr.open('POST', CLOUDINARY_UPLOAD_URL);

    xhr.upload.addEventListener('progress', (evt) => {
      if (evt.lengthComputable && onProgress) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      try {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            url: response.secure_url,
            publicId: response.public_id,
            width: response.width,
            height: response.height,
            bytes: response.bytes,
            format: response.format,
          });
        } else {
          reject(new Error(response?.error?.message || 'Upload failed'));
        }
      } catch (err) {
        reject(new Error('Invalid response from Cloudinary'));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

    xhr.send(formData);
  });
}

/**
 * Returns a Cloudinary URL with on-the-fly transformations.
 * E.g. cldUrl(originalUrl, 'w_400,h_400,c_fill,q_auto,f_auto')
 */
export function cldUrl(originalUrl: string, transform: string): string {
  if (!originalUrl.includes('res.cloudinary.com')) return originalUrl;
  return originalUrl.replace('/upload/', `/upload/${transform}/`);
}
