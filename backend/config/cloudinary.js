// IMPORTANT: dotenv must be loaded before this module is evaluated.
// server.js ensures dotenv.config() runs before any route/config imports.
import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

// ─── Credentials Validation – hard fail, zero local fallback ─────────────────
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey    = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const missingVars = [
  !cloudName  && 'CLOUDINARY_CLOUD_NAME',
  !apiKey     && 'CLOUDINARY_API_KEY',
  !apiSecret  && 'CLOUDINARY_API_SECRET',
].filter(Boolean);

if (missingVars.length > 0) {
  // Crash clearly so the operator fixes the environment.
  // The application MUST NOT fall back to local disk avatar storage.
  throw new Error(
    `[Cloudinary] Missing required environment variable(s): ${missingVars.join(', ')}. ` +
    'Set them in backend/.env. Avatar uploads will NOT fall back to local disk storage.'
  );
}

// ─── Configure Cloudinary SDK ─────────────────────────────────────────────────
cloudinary.config({
  cloud_name: cloudName,
  api_key:    apiKey,
  api_secret: apiSecret,
});

// ─── Memory Storage (files stay in RAM, zero disk I/O) ───────────────────────
const memStorage = multer.memoryStorage();

const imageFilter = (_req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed.'));
  }
};

// ─── Multer Middlewares ───────────────────────────────────────────────────────

/**
 * Avatar upload middleware.
 * File lands in req.file.buffer – nothing written to disk.
 */
export const uploadAvatar = multer({
  storage:    memStorage,
  limits:     { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: imageFilter,
}).single('avatar');

/**
 * Gallery upload middleware.
 * File lands in req.file.buffer – nothing written to disk.
 */
export const uploadGallery = multer({
  storage:    memStorage,
  limits:     { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: imageFilter,
}).single('image');

// ─── Cloudinary Stream Helpers ────────────────────────────────────────────────

/**
 * Stream a Buffer to Cloudinary using upload_stream.
 * MongoDB is NEVER updated until this resolves successfully.
 *
 * @param {Buffer} buffer   - multer memoryStorage buffer (req.file.buffer)
 * @param {string} folder   - Cloudinary folder, e.g. 'titanfit/avatars'
 * @param {object} [opts]   - Additional Cloudinary upload options
 * @returns {Promise<{secure_url: string, public_id: string, ...}>}
 */
export const uploadToCloudinary = (buffer, folder, opts = {}) => {
  return new Promise((resolve, reject) => {
    const options = { folder, resource_type: 'image', ...opts };

    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        return reject(new Error(`Cloudinary upload failed: ${error.message}`));
      }
      if (!result?.secure_url || !result?.public_id) {
        return reject(new Error(
          'Cloudinary returned an incomplete result – missing secure_url or public_id. ' +
          'The database was NOT updated.'
        ));
      }
      resolve(result);
    });

    stream.end(buffer);
  });
};

/**
 * Delete a Cloudinary asset by its public_id.
 * Failure is logged but not re-thrown so it never blocks a user response.
 *
 * @param {string} publicId - Cloudinary public_id (e.g. "titanfit/avatars/abc123")
 */
export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn(`[Cloudinary] Could not delete asset "${publicId}":`, err.message);
  }
};

/**
 * Extract Cloudinary public_id from a secure_url.
 * Used as a legacy fallback for records that stored a URL but not the public_id.
 *
 * Example:
 *   https://res.cloudinary.com/demo/image/upload/v1234/titanfit/avatars/abc.jpg
 *   → "titanfit/avatars/abc"
 *
 * @param {string} url
 * @returns {string|null}
 */
export const extractPublicIdFromUrl = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;
  try {
    const cleanUrl     = url.split('?')[0];
    const parts        = cleanUrl.split('/upload/');
    if (parts.length < 2) return null;
    const afterUpload  = parts[1].replace(/^v\d+\//, ''); // strip version prefix
    return afterUpload.replace(/\.[^/.]+$/, '');           // strip extension
  } catch {
    return null;
  }
};

export { cloudinary };
