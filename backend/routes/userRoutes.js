import express from 'express';
import { getAllUsers, createUserByAdmin, updateUserRole, toggleUserStatus, deleteUser } from '../controllers/userController.js';
import authMiddleware from '../middleware/auth.js';
import isAdmin from '../middleware/admin.js';

const router = express.Router();

router.get('/', authMiddleware, isAdmin, getAllUsers);
router.post('/', authMiddleware, isAdmin, createUserByAdmin);
router.put('/:id/role', authMiddleware, isAdmin, updateUserRole);
router.put('/:id/status', authMiddleware, isAdmin, toggleUserStatus);
router.delete('/:id', authMiddleware, isAdmin, deleteUser);

export default router;
