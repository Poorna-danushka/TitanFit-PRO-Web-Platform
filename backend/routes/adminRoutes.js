import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { adminMiddleware } from '../middleware/admin.js';
import {
  getDashboardStats,
  getMemberAnalytics,
  getAttendanceAnalytics,
  getRevenueAnalytics,
  getUserManagement,
  updateUserRole,
  deactivateUser,
  activateUser,
  triggerExpirationNotifications,
} from '../controllers/adminController.js';

const router = express.Router();

// Admin middleware protection
router.use(authMiddleware, adminMiddleware);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Analytics
router.get('/analytics/members', getMemberAnalytics);
router.get('/analytics/attendance', getAttendanceAnalytics);
router.get('/analytics/revenue', getRevenueAnalytics);

// User management
router.get('/users', getUserManagement);
router.put('/users/:userId/role', updateUserRole);
router.put('/users/:userId/deactivate', deactivateUser);
router.put('/users/:userId/activate', activateUser);

// Manual Trigger for Plan Expiration Notifications & Recommendation Check
router.post('/trigger-expiration-notifications', triggerExpirationNotifications);

export default router;
