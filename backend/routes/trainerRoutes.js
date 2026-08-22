import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getTrainerProfile,
  updateTrainerProfile,
  listTrainers,
  getTrainer,
  getTrainerAvailability,
  setAvailability,
  updateAvailability,
  deleteAvailability,
} from '../controllers/trainerController.js';

const router = express.Router();

// Public routes
router.get('/', listTrainers);
router.get('/:trainerId', getTrainer);
router.get('/:trainerId/availability', getTrainerAvailability);

// Protected routes
router.get('/profile', authMiddleware, getTrainerProfile);
router.put('/profile', authMiddleware, updateTrainerProfile);
router.post('/availability', authMiddleware, setAvailability);
router.put('/availability/:availabilityId', authMiddleware, updateAvailability);
router.delete('/availability/:availabilityId', authMiddleware, deleteAvailability);

export default router;
