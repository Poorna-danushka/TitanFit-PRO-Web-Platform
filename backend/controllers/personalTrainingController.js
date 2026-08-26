import PersonalTrainingPackage from '../models/PersonalTrainingPackage.js';
import PersonalTrainingBooking from '../models/PersonalTrainingBooking.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { HTTP_STATUS, SUCCESS_MESSAGES } from '../constants/index.js';
import {
  bookTrainerSession,
  cancelTrainerBooking,
} from './trainerController.js';

/**
 * Get all personal training packages
 * GET /api/v1/personal-training/packages
 */
export const getPackages = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const packages = await PersonalTrainingPackage.find({ isActive: true })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await PersonalTrainingPackage.countDocuments({ isActive: true });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: packages,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * Get personal training package by ID
 * GET /api/v1/personal-training/packages/:packageId
 */
export const getPackage = asyncHandler(async (req, res) => {
  const { packageId } = req.params;

  const pkg = await PersonalTrainingPackage.findById(packageId).populate('trainerId', 'firstName lastName');

  if (!pkg) {
    throw new NotFoundError('Personal Training Package');
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: pkg,
  });
});

/**
 * Create personal training package (trainer/admin)
 * POST /api/v1/personal-training/packages
 */
export const createPackage = asyncHandler(async (req, res) => {
  const { name, description, sessionCount, sessionDuration, price, trainerId } = req.body;

  const pkg = new PersonalTrainingPackage({
    name,
    description,
    sessionCount,
    sessionDuration,
    price,
    trainerId,
  });

  await pkg.save();

  logger.info(`Personal training package created: ${pkg._id}`);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Package created successfully',
    data: pkg,
  });
});

/**
 * Update personal training package
 * PUT /api/v1/personal-training/packages/:packageId
 */
export const updatePackage = asyncHandler(async (req, res) => {
  const { packageId } = req.params;
  const { name, description, sessionCount, sessionDuration, price, isActive } = req.body;

  const pkg = await PersonalTrainingPackage.findByIdAndUpdate(
    packageId,
    { name, description, sessionCount, sessionDuration, price, isActive },
    { new: true, runValidators: true }
  );

  if (!pkg) {
    throw new NotFoundError('Personal Training Package');
  }

  logger.info(`Personal training package updated: ${packageId}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: SUCCESS_MESSAGES.PROFILE_UPDATED,
    data: pkg,
  });
});

/**
 * Delete personal training package
 * DELETE /api/v1/personal-training/packages/:packageId
 */
export const deletePackage = asyncHandler(async (req, res) => {
  const { packageId } = req.params;

  const pkg = await PersonalTrainingPackage.findByIdAndDelete(packageId);

  if (!pkg) {
    throw new NotFoundError('Personal Training Package');
  }

  logger.info(`Personal training package deleted: ${packageId}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Package deleted successfully',
  });
});

/**
 * Book personal training session (Unified with trainerController)
 * POST /api/v1/personal-training/bookings
 */
export const bookSession = bookTrainerSession;

/**
 * Get my personal training bookings
 * GET /api/v1/personal-training/my-bookings
 */
export const getMyBookings = asyncHandler(async (req, res) => {
  const bookings = await PersonalTrainingBooking.find({ memberId: req.userId })
    .populate('packageId')
    .populate('trainerId', 'firstName lastName email profileImage')
    .sort({ sessionDate: -1, startTime: -1 });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: bookings,
    bookings,
  });
});

/**
 * Get trainer's personal training bookings
 * GET /api/v1/personal-training/trainer-bookings
 */
export const getTrainerBookings = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const bookings = await PersonalTrainingBooking.find({ trainerId: req.userId })
    .populate('memberId', 'firstName lastName email profileImage')
    .populate('packageId')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ sessionDate: 1 });

  const total = await PersonalTrainingBooking.countDocuments({ trainerId: req.userId });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: bookings,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * Cancel personal training booking (Unified with trainerController)
 * DELETE /api/v1/personal-training/bookings/:bookingId
 */
export const cancelBooking = cancelTrainerBooking;
