import TrainerProfile from '../models/TrainerProfile.js';
import TrainerAvailability from '../models/TrainerAvailability.js';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError } from '../utils/errors.js';
import logger from '../utils/logger.js';
import { HTTP_STATUS, SUCCESS_MESSAGES } from '../constants/index.js';

/**
 * Get trainer profile
 * GET /api/v1/trainers/profile
 */
export const getTrainerProfile = asyncHandler(async (req, res) => {
  const trainerProfile = await TrainerProfile.findOne({ userId: req.userId })
    .populate('userId', 'firstName lastName email phone profileImage');

  if (!trainerProfile) {
    throw new NotFoundError('Trainer Profile');
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: trainerProfile,
  });
});

/**
 * Update trainer profile
 * PUT /api/v1/trainers/profile
 */
export const updateTrainerProfile = asyncHandler(async (req, res) => {
  const { specialization, certification, experience, bio, hourlyRate, image } = req.body;

  let trainerProfile = await TrainerProfile.findOne({ userId: req.userId });

  if (!trainerProfile) {
    trainerProfile = new TrainerProfile({ userId: req.userId });
  }

  if (specialization) trainerProfile.specialization = specialization;
  if (certification) trainerProfile.certification = certification;
  if (experience) trainerProfile.experience = experience;
  if (bio) trainerProfile.bio = bio;
  if (hourlyRate) trainerProfile.hourlyRate = hourlyRate;
  if (image) trainerProfile.image = image;

  await trainerProfile.save();

  logger.info(`Trainer profile updated: ${req.userId}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: SUCCESS_MESSAGES.PROFILE_UPDATED,
    data: trainerProfile,
  });
});

/**
 * Get all trainers
 * GET /api/v1/trainers
 */
export const listTrainers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, specialization } = req.query;
  const skip = (page - 1) * limit;

  let query = {};

  if (search) {
    query.$or = [
      { specialization: { $regex: search, $options: 'i' } },
      { bio: { $regex: search, $options: 'i' } },
    ];
  }

  if (specialization) {
    query.specialization = { $regex: specialization, $options: 'i' };
  }

  const trainers = await TrainerProfile.find(query)
    .populate('userId', 'firstName lastName email phone profileImage')
    .skip(skip)
    .limit(parseInt(limit))
    .sort({ createdAt: -1 });

  const total = await TrainerProfile.countDocuments(query);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: trainers,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * Get trainer by ID
 * GET /api/v1/trainers/:trainerId
 */
export const getTrainer = asyncHandler(async (req, res) => {
  const { trainerId } = req.params;

  const trainer = await TrainerProfile.findById(trainerId)
    .populate('userId', 'firstName lastName email phone profileImage');

  if (!trainer) {
    throw new NotFoundError('Trainer');
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: trainer,
  });
});

/**
 * Get trainer availability
 * GET /api/v1/trainers/:trainerId/availability
 */
export const getTrainerAvailability = asyncHandler(async (req, res) => {
  const { trainerId } = req.params;
  const { date } = req.query;

  let query = { trainerId };
  if (date) {
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);
    query.date = { $gte: startDate, $lt: endDate };
  }

  const availability = await TrainerAvailability.find(query).sort({ startTime: 1 });

  res.status(HTTP_STATUS.OK).json({
    success: true,
    data: availability,
  });
});

/**
 * Set trainer availability
 * POST /api/v1/trainers/availability
 */
export const setAvailability = asyncHandler(async (req, res) => {
  const { date, startTime, endTime } = req.body;

  const availability = new TrainerAvailability({
    trainerId: req.userId,
    date,
    startTime,
    endTime,
    isBooked: false,
  });

  await availability.save();

  logger.info(`Trainer availability set: ${availability._id}`);

  res.status(HTTP_STATUS.CREATED).json({
    success: true,
    message: 'Availability set successfully',
    data: availability,
  });
});

/**
 * Update trainer availability
 * PUT /api/v1/trainers/availability/:availabilityId
 */
export const updateAvailability = asyncHandler(async (req, res) => {
  const { availabilityId } = req.params;
  const { date, startTime, endTime, isBooked } = req.body;

  const availability = await TrainerAvailability.findByIdAndUpdate(
    availabilityId,
    { date, startTime, endTime, isBooked },
    { new: true, runValidators: true }
  );

  if (!availability) {
    throw new NotFoundError('Availability');
  }

  logger.info(`Trainer availability updated: ${availabilityId}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: SUCCESS_MESSAGES.PROFILE_UPDATED,
    data: availability,
  });
});

/**
 * Delete trainer availability
 * DELETE /api/v1/trainers/availability/:availabilityId
 */
export const deleteAvailability = asyncHandler(async (req, res) => {
  const { availabilityId } = req.params;

  const availability = await TrainerAvailability.findByIdAndDelete(availabilityId);

  if (!availability) {
    throw new NotFoundError('Availability');
  }

  logger.info(`Trainer availability deleted: ${availabilityId}`);

  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: 'Availability deleted successfully',
  });
});
