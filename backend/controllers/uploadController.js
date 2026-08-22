import User from '../models/User.js';
import { uploadToCloudinary, deleteFromCloudinary, extractPublicIdFromUrl } from '../config/cloudinary.js';

/**
 * @desc    Upload / replace profile avatar
 * @route   POST /api/v1/auth/avatar
 * @access  Private
 *
 * Transaction-safe flow:
 *  1. Read existing avatar info from DB.
 *  2. Stream buffer to Cloudinary.
 *  3. Verify Cloudinary returned secure_url + public_id.
 *  4. Update MongoDB.
 *  5. Only AFTER DB update succeeds → delete old Cloudinary image.
 *  If any step fails, the previous avatar is preserved and any newly
 *  uploaded orphan is cleaned up.
 */
export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided.' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Snapshot old avatar data BEFORE touching anything
    const oldUrl      = user.profileImage       || null;
    const oldPublicId = user.profileImagePublicId || extractPublicIdFromUrl(oldUrl);

    // ── Step 1: Upload new image to Cloudinary ──────────────────────────────
    let cloudinaryResult;
    try {
      cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'titanfit/avatars', {
        transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto' }],
      });
    } catch (uploadErr) {
      // Cloudinary failed – abort; do not modify existing avatar
      return res.status(502).json({
        message: 'Image upload to Cloudinary failed. Your existing avatar was not changed.',
        error:   uploadErr.message,
      });
    }

    const newUrl      = cloudinaryResult.secure_url;
    const newPublicId = cloudinaryResult.public_id;

    // ── Step 2: Update MongoDB ───────────────────────────────────────────────
    try {
      user.profileImage        = newUrl;
      user.profileImagePublicId = newPublicId;
      await user.save();
    } catch (dbErr) {
      // DB update failed – clean up the newly uploaded Cloudinary image to avoid orphan
      await deleteFromCloudinary(newPublicId);
      return res.status(500).json({
        message: 'Failed to save avatar to database. The uploaded image was removed from Cloudinary.',
        error:   dbErr.message,
      });
    }

    // ── Step 3: Delete old Cloudinary image (safe – DB already updated) ─────
    if (oldPublicId) {
      await deleteFromCloudinary(oldPublicId);
    }

    const userObj = user.toObject();
    delete userObj.password;

    return res.status(200).json({
      message:              'Profile image updated successfully.',
      profileImage:         newUrl,
      profileImagePublicId: newPublicId,
      avatarUrl:            newUrl,
      user:                 userObj,
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return res.status(500).json({ message: error.message || 'Failed to upload image.' });
  }
};

/**
 * @desc    Delete profile avatar
 * @route   DELETE /api/v1/auth/avatar
 * @access  Private
 */
export const deleteProfileImage = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!user.profileImage) {
      return res.status(400).json({ message: 'No profile image to delete.' });
    }

    const publicId = user.profileImagePublicId || extractPublicIdFromUrl(user.profileImage);

    // Clear DB first
    user.profileImage        = null;
    user.profileImagePublicId = null;
    await user.save();

    // Delete from Cloudinary after DB is clean
    if (publicId) {
      await deleteFromCloudinary(publicId);
    }

    const userObj = user.toObject();
    delete userObj.password;

    return res.status(200).json({
      message: 'Profile image removed.',
      user:    userObj,
    });
  } catch (error) {
    console.error('Avatar delete error:', error);
    return res.status(500).json({ message: 'Failed to delete image.' });
  }
};

/**
 * @desc    Upload image to user gallery
 * @route   POST /api/v1/auth/gallery
 * @access  Private
 */
export const uploadGalleryImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided.' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Upload buffer to Cloudinary
    let cloudinaryResult;
    try {
      cloudinaryResult = await uploadToCloudinary(req.file.buffer, 'titanfit/gallery', {
        transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
      });
    } catch (uploadErr) {
      return res.status(502).json({
        message: 'Image upload to Cloudinary failed.',
        error:   uploadErr.message,
      });
    }

    const newImage = {
      url:        cloudinaryResult.secure_url,
      publicId:   cloudinaryResult.public_id,
      caption:    req.body.caption || '',
      uploadedAt: new Date(),
    };

    if (!user.galleryImages) user.galleryImages = [];
    user.galleryImages.unshift(newImage);

    try {
      await user.save();
    } catch (dbErr) {
      // Clean up orphan on DB failure
      await deleteFromCloudinary(cloudinaryResult.public_id);
      return res.status(500).json({
        message: 'Failed to save gallery image to database. The uploaded image was removed from Cloudinary.',
        error:   dbErr.message,
      });
    }

    const userObj = user.toObject();
    delete userObj.password;

    return res.status(201).json({
      message: 'Gallery image uploaded successfully.',
      image:   newImage,
      user:    userObj,
    });
  } catch (error) {
    console.error('Gallery image upload error:', error);
    return res.status(500).json({ message: error.message || 'Failed to upload gallery image.' });
  }
};

/**
 * @desc    Delete image from user gallery
 * @route   DELETE /api/v1/auth/gallery/:imageId
 * @access  Private
 */
export const deleteGalleryImage = async (req, res) => {
  try {
    const { imageId } = req.params;
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const imageItem = user.galleryImages?.id(imageId);
    if (!imageItem) {
      return res.status(404).json({ message: 'Image not found in gallery.' });
    }

    const publicId = imageItem.publicId || extractPublicIdFromUrl(imageItem.url);

    // Remove from DB first
    user.galleryImages.pull(imageId);
    await user.save();

    // Then delete from Cloudinary
    if (publicId) {
      await deleteFromCloudinary(publicId);
    }

    const userObj = user.toObject();
    delete userObj.password;

    return res.status(200).json({
      message: 'Gallery image removed.',
      user:    userObj,
    });
  } catch (error) {
    console.error('Gallery image delete error:', error);
    return res.status(500).json({ message: 'Failed to delete gallery image.' });
  }
};

