import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';
import {
  getMembershipPlans,
  createMembershipPlan,
  updateMembershipPlan,
  purchaseMembership,
  getMyMembership,
  renewMembership,
  cancelMembership,
  getAllMemberships,
} from '../controllers/membershipController.js';

const router = express.Router();

// Public routes
router.get('/plans', getMembershipPlans);

// Protected routes
router.post('/purchase', authMiddleware, purchaseMembership);
router.get('/my-membership', authMiddleware, getMyMembership);
router.post('/renew', authMiddleware, renewMembership);
router.post('/cancel', authMiddleware, cancelMembership);

// Admin routes
router.post('/plans', authMiddleware, adminMiddleware, createMembershipPlan);
router.put('/plans/:planId', authMiddleware, adminMiddleware, updateMembershipPlan);
router.get('/admin/all', authMiddleware, adminMiddleware, getAllMemberships);

export default router;
