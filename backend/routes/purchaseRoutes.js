import express from 'express';
import {
  getAllPurchases,
  getMyPurchases,
  createCardPurchase,
  createBankTransferPurchase,
  approveBankTransfer,
  rejectBankTransfer,
  updatePurchaseStatus,
} from '../controllers/purchaseController.js';
import authMiddleware from '../middleware/auth.js';
import isAdmin from '../middleware/admin.js';

const router = express.Router();

router.get('/', authMiddleware, isAdmin, getAllPurchases);
router.get('/my-purchases', authMiddleware, getMyPurchases);
router.post('/card', authMiddleware, createCardPurchase);
router.post('/bank-transfer', authMiddleware, createBankTransferPurchase);
router.post('/', authMiddleware, createCardPurchase);

router.put('/:id/approve-bank-transfer', authMiddleware, isAdmin, approveBankTransfer);
router.put('/:id/reject-bank-transfer', authMiddleware, isAdmin, rejectBankTransfer);
router.put('/:id/status', authMiddleware, isAdmin, updatePurchaseStatus);

export default router;
