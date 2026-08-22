import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getPackages,
  getPackage,
  createPackage,
  updatePackage,
  deletePackage,
  bookSession,
  getMyBookings,
  getTrainerBookings,
  cancelBooking,
} from '../controllers/personalTrainingController.js';

const router = express.Router();

// Public routes
router.get('/packages', getPackages);
router.get('/packages/:packageId', getPackage);

// Protected routes
router.post('/bookings', authMiddleware, bookSession);
router.get('/bookings/my-bookings', authMiddleware, getMyBookings);
router.get('/trainer-bookings', authMiddleware, getTrainerBookings);
router.delete('/bookings/:bookingId', authMiddleware, cancelBooking);

// Trainer/Admin routes
router.post('/packages', authMiddleware, createPackage);
router.put('/packages/:packageId', authMiddleware, updatePackage);
router.delete('/packages/:packageId', authMiddleware, deletePackage);

export default router;
