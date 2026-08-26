import express from 'express';
import {
  getAllPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage,
} from '../controllers/packageController.js';
import authMiddleware from '../middleware/auth.js';
import isAdmin from '../middleware/admin.js';

const router = express.Router();

// Public endpoints
router.get('/', getAllPackages);
router.get('/:id', getPackageById);

// Admin endpoints
router.post('/', authMiddleware, isAdmin, createPackage);
router.put('/:id', authMiddleware, isAdmin, updatePackage);
router.delete('/:id', authMiddleware, isAdmin, deletePackage);

export default router;
