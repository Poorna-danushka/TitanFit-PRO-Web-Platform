import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requirePersonalTrainerAccess } from '../middleware/entitlementMiddleware.js';
import {
  getTrainerProfile,
  updateTrainerProfile,
  listTrainers,
  getTrainer,
  getTrainerAvailability,
  getWeeklySlotsForTrainer,
  getTrainerEligibility,
  selectTrainer,
  getMyTrainer,
  bookTrainerSession,
  cancelTrainerBooking,
  cancelRecurringSlot,
  updateBookingStatus,
  getMyBookings,
  getCoachWeeklyAvailability,
  updateCoachWeeklyAvailability,
  getCoachTrainingSpace,
  setAvailability,
  updateAvailability,
  deleteAvailability,
} from '../controllers/trainerController.js';

const router = express.Router();

// ─── Protected Member PT Routes (Strict Entitlement Gated) ───────────────────
// Eligibility check is available to all authenticated members to fetch their entitlement status
router.get('/eligibility', authMiddleware, getTrainerEligibility);

// All private PT actions strictly require active Personal Trainer plan entitlement
router.post('/select', authMiddleware, requirePersonalTrainerAccess, selectTrainer);
router.get('/my-trainer', authMiddleware, requirePersonalTrainerAccess, getMyTrainer);
router.post('/book', authMiddleware, requirePersonalTrainerAccess, bookTrainerSession);
router.post('/multi-book', authMiddleware, requirePersonalTrainerAccess, bookTrainerSession);
router.get('/my-bookings', authMiddleware, requirePersonalTrainerAccess, getMyBookings);
router.delete('/bookings/:bookingId', authMiddleware, cancelTrainerBooking);
router.patch('/bookings/:bookingId/status', authMiddleware, updateBookingStatus);
// Cancel all future occurrences of a recurring weekly slot selection
router.delete('/recurring-slots/:recurringSlotId', authMiddleware, requirePersonalTrainerAccess, cancelRecurringSlot);
router.get('/:trainerId/weekly-slots', authMiddleware, requirePersonalTrainerAccess, getWeeklySlotsForTrainer);
router.get('/:trainerId/availability', authMiddleware, requirePersonalTrainerAccess, getTrainerAvailability);

// ─── Protected Trainer Portal Routes (For Trainers/Staff) ─────────────────────
router.get('/profile', authMiddleware, getTrainerProfile);
router.put('/profile', authMiddleware, updateTrainerProfile);
router.get('/training-space', authMiddleware, getCoachTrainingSpace);
router.get('/weekly-availability', authMiddleware, getCoachWeeklyAvailability);
router.put('/weekly-availability', authMiddleware, updateCoachWeeklyAvailability);
router.post('/availability', authMiddleware, setAvailability);
router.put('/availability/:availabilityId', authMiddleware, updateAvailability);
router.delete('/availability/:availabilityId', authMiddleware, deleteAvailability);

// ─── Public Marketing Routes (For Home page & Public Preview) ─────────────────
router.get('/', listTrainers);
router.get('/:trainerId', getTrainer);

export default router;
