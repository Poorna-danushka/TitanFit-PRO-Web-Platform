import CompletedExercise from '../models/CompletedExercise.js';
import { checkUserMembershipStatus } from '../utils/membershipHelper.js';

export const markComplete = async (req, res) => {
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

    const { exerciseId } = req.body;
    const completed = new CompletedExercise({ userId: req.userId, exerciseId });
    await completed.save();
    res.status(201).json({ message: 'Exercise marked as complete', completed });
  } catch (error) {
    res.status(500).json({ message: 'Error marking exercise as complete', error: error.message });
  }
};

export const getMyCompletedExercises = async (req, res) => {
  try {
    const completed = await CompletedExercise.find({ userId: req.userId }).populate('exerciseId');
    res.status(200).json({ count: completed.length, completed });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching completed exercises' });
  }
};
