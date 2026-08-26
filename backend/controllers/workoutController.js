import Workout from '../models/Workout.js';
import { checkUserMembershipStatus } from '../utils/membershipHelper.js';

export const getAllWorkouts = async (req, res) => {
  try {
    const workouts = await Workout.find().populate('exerciseId').sort({ date: -1 });
    res.status(200).json({ count: workouts.length, workouts });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching workouts', error: error.message });
  }
};

export const getMyWorkouts = async (req, res) => {
  try {
    const workouts = await Workout.find({ userId: req.userId }).populate('exerciseId').sort({ date: -1 });
    res.status(200).json({ count: workouts.length, workouts });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching your workouts', error: error.message });
  }
};

export const getWorkoutById = async (req, res) => {
  try {
    const workout = await Workout.findById(req.params.id).populate('exerciseId');
    if (!workout) {
      return res.status(404).json({ message: 'Workout not found' });
    }
    res.status(200).json({ workout });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching workout', error: error.message });
  }
};

export const createWorkout = async (req, res) => {
  try {
    const isPrivileged = ['ADMIN', 'SYSTEM_ADMIN', 'TRAINER', 'STAFF'].includes(req.userRole);
    if (!isPrivileged) {
      const membershipStatus = await checkUserMembershipStatus(req.userId);
      if (!membershipStatus.hasActiveMembership) {
        if (membershipStatus.isPendingVerification) {
          return res.status(403).json({
            success: false,
            code: 'PENDING_VERIFICATION',
            message: 'Your bank transfer is awaiting administrator verification.',
          });
        }
        return res.status(403).json({
          success: false,
          code: 'MEMBERSHIP_REQUIRED',
          message: 'Active membership required for this action',
        });
      }
    }

    const { exerciseId, duration, sets, reps, date, difficulty } = req.body;
    
    const workout = new Workout({
      userId: req.userId,
      exerciseId,
      duration,
      sets,
      reps,
      // difficulty drives the calorie multiplier in the pre-save hook
      difficulty: difficulty || 'intermediate',
      date: date || new Date()
    });

    await workout.save();
    res.status(201).json({ message: 'Workout logged successfully', workout });
  } catch (error) {
    res.status(500).json({ message: 'Error creating workout', error: error.message });
  }
};

export const updateWorkout = async (req, res) => {
  try {
    const { duration, sets, reps, date } = req.body;
    const workout = await Workout.findById(req.params.id);
    
    if (!workout) {
      return res.status(404).json({ message: 'Workout not found' });
    }
    
    // Check if user owns the workout (or is admin, which we'll assume is handled elsewhere or not strictly enforced here)
    if (workout.userId.toString() !== req.userId && !['ADMIN', 'SYSTEM_ADMIN'].includes(req.userRole)) {
      return res.status(403).json({ message: 'Not authorized to update this workout' });
    }

    if (duration) workout.duration = duration;
    if (sets) workout.sets = sets;
    if (reps) workout.reps = reps;
    if (date) workout.date = date;

    await workout.save();
    res.status(200).json({ message: 'Workout updated successfully', workout });
  } catch (error) {
    res.status(500).json({ message: 'Error updating workout', error: error.message });
  }
};

export const deleteWorkout = async (req, res) => {
  try {
    const workout = await Workout.findById(req.params.id);
    
    if (!workout) {
      return res.status(404).json({ message: 'Workout not found' });
    }

    if (workout.userId.toString() !== req.userId && !['ADMIN', 'SYSTEM_ADMIN'].includes(req.userRole)) {
      return res.status(403).json({ message: 'Not authorized to delete this workout' });
    }

    await workout.deleteOne();
    res.status(200).json({ message: 'Workout deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting workout', error: error.message });
  }
};
