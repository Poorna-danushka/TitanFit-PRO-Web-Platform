import Purchase from '../models/Purchase.js';
import Payment from '../models/Payment.js';
import Package from '../models/Package.js';
import MembershipPlan from '../models/MembershipPlan.js';
import Membership from '../models/Membership.js';
import User from '../models/User.js';
import { sendPaymentReceipt } from '../utils/email.js';
import logger from '../utils/logger.js';

/**
 * Get all purchases for Admin (includes pending approval bank transfers)
 */
export const getAllPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find()
      .populate('userId', 'name email phone')
      .populate('packageId', 'name price duration')
      .populate('paymentId')
      .sort({ createdAt: -1 });

    res.status(200).json({ count: purchases.length, purchases });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching purchases', error: error.message });
  }
};

/**
 * Get current user's purchases
 */
export const getMyPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find({ userId: req.userId })
      .populate('packageId')
      .populate('paymentId')
      .sort({ createdAt: -1 });

    res.status(200).json({ purchases });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching your purchases' });
  }
};

/**
 * Process Card Payment Purchase
 * POST /api/v1/purchases/card
 */
export const createCardPurchase = async (req, res) => {
  try {
    const { packageId, price } = req.body;
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let pkg = await Package.findById(packageId);
    if (!pkg) {
      pkg = await MembershipPlan.findById(packageId);
    }

    const packageName = pkg?.name || 'Gym Membership';
    const amount = price || pkg?.price || 0;

    // Create completed payment record
    const payment = new Payment({
      userId,
      packageId: pkg?._id || packageId,
      amount,
      currency: 'LKR',
      status: 'completed',
      paymentMethod: 'card',
      description: `Card Purchase - ${packageName}`,
    });
    await payment.save();

    // Create active purchase record
    const purchase = new Purchase({
      userId,
      packageId: pkg?._id || packageId,
      price: amount,
      paymentId: payment._id,
      paymentMethod: 'card',
      status: 'paid',
    });
    await purchase.save();

    // Activate Membership
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (pkg?.durationMonths || 1));

    await Membership.create({
      memberId: userId,
      planId: pkg?._id || packageId,
      startDate,
      endDate,
      status: 'ACTIVE',
    });

    // Send Payment Receipt Email
    sendPaymentReceipt(user.email, {
      packageName,
      amount,
      paymentMethod: 'card',
      receiptId: purchase._id,
      date: new Date(),
    });

    logger.info(`Card payment completed & receipt sent to ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'Card payment processed & payment receipt sent to email!',
      purchase,
    });
  } catch (error) {
    logger.error(`Error processing card purchase: ${error.message}`);
    res.status(500).json({ message: 'Error processing card purchase', error: error.message });
  }
};

/**
 * Submit Bank Transfer Purchase for Admin Approval
 * POST /api/v1/purchases/bank-transfer
 */
export const createBankTransferPurchase = async (req, res) => {
  try {
    const { packageId, price, bankTransferReference, transferSlipUrl } = req.body;
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    let pkg = await Package.findById(packageId);
    if (!pkg) {
      pkg = await MembershipPlan.findById(packageId);
    }

    const packageName = pkg?.name || 'Gym Membership';
    const amount = price || pkg?.price || 0;

    // Create pending approval payment
    const payment = new Payment({
      userId,
      packageId: pkg?._id || packageId,
      amount,
      currency: 'LKR',
      status: 'pending_approval',
      paymentMethod: 'bank_transfer',
      bankTransferReference: bankTransferReference || 'REF-' + Date.now(),
      transferSlipUrl: transferSlipUrl || '',
      description: `Bank Transfer - ${packageName}`,
    });
    await payment.save();

    // Create pending approval purchase
    const purchase = new Purchase({
      userId,
      packageId: pkg?._id || packageId,
      price: amount,
      paymentId: payment._id,
      paymentMethod: 'bank_transfer',
      bankTransferReference: bankTransferReference || 'REF-' + Date.now(),
      transferSlipUrl: transferSlipUrl || '',
      status: 'pending_approval',
    });
    await purchase.save();

    logger.info(`Bank transfer submitted for approval by ${user.email} (Ref: ${bankTransferReference})`);

    res.status(201).json({
      success: true,
      message: 'Bank transfer payment submitted successfully! Awaiting admin verification.',
      purchase,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting bank transfer', error: error.message });
  }
};

/**
 * Admin Approve Bank Transfer
 * PUT /api/v1/purchases/:id/approve-bank-transfer
 */
export const approveBankTransfer = async (req, res) => {
  try {
    const purchaseId = req.params.id;
    const purchase = await Purchase.findById(purchaseId)
      .populate('userId')
      .populate('packageId');

    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    purchase.status = 'paid';
    await purchase.save();

    if (purchase.paymentId) {
      await Payment.findByIdAndUpdate(purchase.paymentId, {
        status: 'completed',
        approvedBy: req.userId,
        approvedAt: new Date(),
      });
    }

    const user = purchase.userId;
    const pkg = purchase.packageId;

    // Activate Membership
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (pkg?.durationMonths || 1));

    await Membership.create({
      memberId: user._id,
      planId: pkg?._id,
      startDate,
      endDate,
      status: 'ACTIVE',
    });

    // Send Payment Receipt Email upon Approval
    sendPaymentReceipt(user.email, {
      packageName: pkg?.name || 'Gym Membership',
      amount: purchase.price,
      paymentMethod: 'bank_transfer',
      receiptId: purchase._id,
      date: new Date(),
    });

    logger.info(`Bank transfer approved by Admin for ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Bank transfer approved! Membership activated & payment receipt sent to member email.',
      purchase,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error approving bank transfer', error: error.message });
  }
};

/**
 * Admin Reject Bank Transfer
 * PUT /api/v1/purchases/:id/reject-bank-transfer
 */
export const rejectBankTransfer = async (req, res) => {
  try {
    const purchaseId = req.params.id;
    const purchase = await Purchase.findById(purchaseId);

    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    purchase.status = 'rejected';
    await purchase.save();

    if (purchase.paymentId) {
      await Payment.findByIdAndUpdate(purchase.paymentId, {
        status: 'rejected',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Bank transfer rejected.',
      purchase,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting bank transfer', error: error.message });
  }
};

export const createPurchase = createCardPurchase;
export const updatePurchaseStatus = async (req, res) => {
  const { status } = req.body;
  const purchase = await Purchase.findByIdAndUpdate(req.params.id, { status }, { new: true });
  res.status(200).json({ purchase });
};
