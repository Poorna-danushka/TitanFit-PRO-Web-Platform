import Purchase from '../models/Purchase.js';
import Payment from '../models/Payment.js';
import Package from '../models/Package.js';
import MembershipPlan from '../models/MembershipPlan.js';
import Membership from '../models/Membership.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import TrainerAssignment from '../models/TrainerAssignment.js';
import { sendPaymentReceipt } from '../utils/email.js';
import logger from '../utils/logger.js';
import { checkUserMembershipStatus } from '../utils/membershipHelper.js';
import { checkPlanIncludesPT } from '../utils/entitlements.js';

/**
 * Get all purchases for Admin (includes pending approval bank transfers)
 */
export const getAllPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find()
      .populate('userId', 'firstName lastName name email phone profileImage')
      .populate('packageId', 'name price duration')
      .populate('paymentId')
      .sort({ createdAt: -1 });

    res.status(200).json({ count: purchases.length, purchases });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching purchases', error: error.message });
  }
};

/**
 * Get current user's purchases with clearly separated active & pending states
 */
export const getMyPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find({ userId: req.userId })
      .populate('packageId')
      .populate('paymentId')
      .sort({ createdAt: -1 });

    // Active purchases are strictly paid purchases
    const activePurchases = purchases.filter((p) => p.status === 'paid');
    
    // Pending purchases awaiting administrator verification
    const pendingPurchases = purchases.filter(
      (p) =>
        ['pending_approval', 'pending_verification', 'pending'].includes(p.status) &&
        p.paymentMethod === 'bank_transfer'
    );

    const membershipStatus = await checkUserMembershipStatus(req.userId);

    res.status(200).json({
      purchases,
      activePurchases,
      pendingPurchases,
      latestActivePurchase: activePurchases[0] || null,
      latestPendingPurchase: pendingPurchases[0] || null,
      hasActiveMembership: membershipStatus.hasActiveMembership,
      isPendingVerification: membershipStatus.isPendingVerification,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching your purchases', error: error.message });
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

    // Deactivate previous active memberships for this user
    await Membership.updateMany(
      { $or: [{ userId }, { memberId: userId }], status: 'ACTIVE' },
      { status: 'EXPIRED' }
    );

    // Activate Membership
    const startDate = new Date();
    const endDate = new Date();
    const durationMonths = pkg?.durationMonths || (pkg?.durationDays ? Math.ceil(pkg.durationDays / 30) : 1);
    endDate.setMonth(endDate.getMonth() + durationMonths);

    await Membership.create({
      memberId: userId,
      userId,
      planId: pkg?._id || packageId,
      packageId: pkg?._id || packageId,
      paymentId: payment._id,
      paymentStatus: 'PAID',
      startDate,
      endDate,
      status: 'ACTIVE',
    });

    // Check if plan includes personal training
    const hasPersonalTrainer = checkPlanIncludesPT(pkg);

    // If new membership does NOT include personal training, deactivate active trainer assignment
    if (!hasPersonalTrainer) {
      await TrainerAssignment.updateMany(
        { memberId: userId, status: 'ACTIVE' },
        { status: 'CANCELLED', cancelledAt: new Date() }
      );
    }

    // Send Payment Receipt Email
    try {
      sendPaymentReceipt(user.email, {
        packageName,
        amount,
        paymentMethod: 'card',
        receiptId: purchase._id,
        date: new Date(),
      });
    } catch (emailErr) {
      logger.warn(`Failed to send card payment receipt: ${emailErr.message}`);
    }

    logger.info(`Card payment completed & receipt sent to ${user.email} (hasPersonalTrainer: ${hasPersonalTrainer})`);

    res.status(201).json({
      success: true,
      message: 'Card payment processed & payment receipt sent to email!',
      purchase,
      hasPersonalTrainer,
      isEligibleForTrainer: hasPersonalTrainer,
      redirectTo: hasPersonalTrainer ? '/trainers' : '/dashboard',
    });
  } catch (error) {
    logger.error(`Error processing card purchase: ${error.message}`);
    res.status(500).json({ message: 'Error processing card purchase', error: error.message });
  }
};

/**
 * Submit Bank Transfer Purchase for Admin Approval
 * POST /api/v1/purchases/bank-transfer
 * 
 * Rules enforced:
 * 1. Create Purchase record with status 'pending_approval'
 * 2. Create Payment record with status 'pending_approval'
 * 3. Do NOT create or activate Membership
 * 4. Do NOT grant package features or entitlements
 * 5. Do NOT send payment receipt email
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
    logger.error(`Error submitting bank transfer: ${error.message}`);
    res.status(500).json({ message: 'Error submitting bank transfer', error: error.message });
  }
};

/**
 * Admin Approve Bank Transfer
 * PUT /api/v1/purchases/:id/approve-bank-transfer
 * 
 * Rules enforced:
 * 1. Validate purchase exists and is currently pending
 * 2. Prevent duplicate approvals
 * 3. Update purchase status to 'paid' and payment status to 'completed'
 * 4. Create active Membership record
 * 5. Send Payment Receipt Email upon approval
 * 6. Send activation Notification
 * 7. Record audit log
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

    if (purchase.status === 'paid') {
      return res.status(400).json({ message: 'Purchase has already been approved and paid.' });
    }

    if (!['pending_approval', 'pending_verification', 'pending'].includes(purchase.status)) {
      return res.status(400).json({ message: 'Only pending purchases can be approved.' });
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
    let pkg = purchase.packageId;
    if (!pkg) {
      pkg = await MembershipPlan.findById(purchase.packageId).catch(() => null);
    }

    // Activate Membership (prevent duplicate)
    let membership = await Membership.findOne({
      paymentId: purchase.paymentId || purchase._id,
    });

    if (!membership) {
      const startDate = new Date();
      const endDate = new Date();
      const durationMonths = pkg?.durationMonths || (pkg?.durationDays ? Math.ceil(pkg.durationDays / 30) : 1);
      endDate.setMonth(endDate.getMonth() + durationMonths);

      membership = await Membership.create({
        memberId: user._id,
        userId: user._id,
        planId: pkg?._id,
        packageId: pkg?._id,
        paymentId: purchase.paymentId || purchase._id,
        paymentStatus: 'PAID',
        startDate,
        endDate,
        status: 'ACTIVE',
      });
    }

    // Deactivate previous active memberships for this user
    await Membership.updateMany(
      { $or: [{ userId: user._id }, { memberId: user._id }], status: 'ACTIVE', _id: { $ne: membership._id } },
      { status: 'EXPIRED' }
    );

    const hasPersonalTrainer = checkPlanIncludesPT(pkg);

    // If approved membership does NOT include personal training, deactivate active trainer assignment
    if (!hasPersonalTrainer) {
      await TrainerAssignment.updateMany(
        { memberId: user._id, status: 'ACTIVE' },
        { status: 'CANCELLED', cancelledAt: new Date() }
      );
    }

    // Send Payment Receipt Email upon Approval
    try {
      sendPaymentReceipt(user.email, {
        packageName: pkg?.name || 'Gym Membership',
        amount: purchase.price,
        paymentMethod: 'bank_transfer',
        receiptId: purchase._id,
        date: new Date(),
      });
    } catch (emailErr) {
      logger.warn(`Failed to send receipt email on bank transfer approval: ${emailErr.message}`);
    }

    // Send In-App Activation Notification
    try {
      await Notification.create({
        title: 'Membership Activated',
        message: `Your bank transfer payment of LKR ${(purchase.price || 0).toLocaleString()} for ${pkg?.name || 'Gym Membership'} has been approved! Your membership is now active.`,
        type: 'success',
        createdBy: req.userId ? String(req.userId) : 'Admin',
      });
    } catch (notifErr) {
      logger.warn(`Failed to create approval notification: ${notifErr.message}`);
    }

    logger.info(`Bank transfer approved by Admin ${req.userId} for purchase ${purchase._id}, user ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Bank transfer approved! Membership activated & payment receipt sent to member email.',
      purchase,
      membership,
    });
  } catch (error) {
    logger.error(`Error approving bank transfer: ${error.message}`);
    res.status(500).json({ message: 'Error approving bank transfer', error: error.message });
  }
};

/**
 * Admin Reject Bank Transfer
 * PUT /api/v1/purchases/:id/reject-bank-transfer
 * 
 * Rules enforced:
 * 1. Validate purchase exists and is currently pending
 * 2. Update status to 'rejected'
 * 3. Do NOT create membership
 * 4. Do NOT send receipt
 * 5. Send rejection notification to user
 * 6. Record audit log
 */
export const rejectBankTransfer = async (req, res) => {
  try {
    const purchaseId = req.params.id;
    const purchase = await Purchase.findById(purchaseId).populate('packageId');

    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    if (purchase.status === 'paid') {
      return res.status(400).json({ message: 'Cannot reject an already approved/paid purchase.' });
    }

    if (purchase.status === 'rejected') {
      return res.status(400).json({ message: 'Purchase has already been rejected.' });
    }

    purchase.status = 'rejected';
    await purchase.save();

    if (purchase.paymentId) {
      await Payment.findByIdAndUpdate(purchase.paymentId, {
        status: 'rejected',
      });
    }

    // Send In-App Rejection Notification
    try {
      await Notification.create({
        title: 'Bank Transfer Verification Failed',
        message: `Your bank transfer for ${purchase.packageId?.name || 'gym package'} (Ref: ${purchase.bankTransferReference || 'N/A'}) was rejected by administration. Please check your reference or contact support.`,
        type: 'urgent',
        createdBy: req.userId ? String(req.userId) : 'Admin',
      });
    } catch (notifErr) {
      logger.warn(`Failed to create rejection notification: ${notifErr.message}`);
    }

    logger.info(`Bank transfer rejected by Admin ${req.userId} for purchase ${purchase._id}`);

    res.status(200).json({
      success: true,
      message: 'Bank transfer rejected.',
      purchase,
    });
  } catch (error) {
    logger.error(`Error rejecting bank transfer: ${error.message}`);
    res.status(500).json({ message: 'Error rejecting bank transfer', error: error.message });
  }
};

export const createPurchase = createCardPurchase;
export const updatePurchaseStatus = async (req, res) => {
  const { status } = req.body;
  const purchase = await Purchase.findByIdAndUpdate(req.params.id, { status }, { new: true });
  res.status(200).json({ purchase });
};

