import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';
import {
  generateQRCode,
  getMyQRCode,
  scanQR,
  checkIn,
  checkOut,
  getAttendanceHistory,
  getAllAttendance,
  getAttendanceStats,
} from '../controllers/attendanceController.js';

const router = express.Router();

// Protected routes
router.post('/generate-qr', authMiddleware, generateQRCode);
router.get('/my-qr', authMiddleware, getMyQRCode);
router.post('/scan-qr', authMiddleware, scanQR);
router.post('/check-in', authMiddleware, checkIn);
router.post('/check-out', authMiddleware, checkOut);
router.get('/my-history', authMiddleware, getAttendanceHistory);
router.get('/history', authMiddleware, getAttendanceHistory);
router.get('/stats', authMiddleware, getAttendanceStats);

// Admin / Staff routes
router.get('/admin/records', authMiddleware, adminMiddleware, getAllAttendance);
router.get('/admin/stats', authMiddleware, adminMiddleware, getAttendanceStats);

export default router;
