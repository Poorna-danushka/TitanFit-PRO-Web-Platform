import express from 'express';
import {
  register,
  login,
  forgotPassword,
  refreshAccessToken,
  verifyEmail,
  resendVerificationEmail,
  getMe,
  updateProfile,
  logout,
  getCsrfToken,
  changePassword,
} from '../controllers/authController.js';
import authMiddleware from '../middleware/auth.js';
import { validate, registerValidator, loginValidator, forgotPasswordValidator } from '../validators/index.js';
import { uploadAvatar, uploadGallery } from '../config/cloudinary.js';
import { uploadProfileImage, deleteProfileImage, uploadGalleryImage, deleteGalleryImage } from '../controllers/uploadController.js';

// Multer error wrappers
const handleUpload = (req, res, next) => {
  uploadAvatar(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Upload failed.' });
    }
    next();
  });
};

const handleGalleryUpload = (req, res, next) => {
  uploadGallery(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Upload failed.' });
    }
    next();
  });
};

const router = express.Router();

// Public routes
router.get('/csrf-token', getCsrfToken);
router.post('/register', validate(registerValidator), register);
router.post('/login', validate(loginValidator), login);
router.post('/forgot-password', validate(forgotPasswordValidator), forgotPassword);
router.post('/refresh', refreshAccessToken);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);

// Protected routes
router.get('/me',              authMiddleware, getMe);
router.put('/profile',         authMiddleware, updateProfile);
router.post('/change-password', authMiddleware, changePassword);
router.put('/change-password',  authMiddleware, changePassword);
router.post('/logout',          authMiddleware, logout);

// Avatar (profile image) routes
router.post('/avatar',   authMiddleware, handleUpload, uploadProfileImage);
router.delete('/avatar', authMiddleware, deleteProfileImage);

// Gallery / Transformation images routes
router.post('/gallery',            authMiddleware, handleGalleryUpload, uploadGalleryImage);
router.delete('/gallery/:imageId', authMiddleware, deleteGalleryImage);

export default router;
