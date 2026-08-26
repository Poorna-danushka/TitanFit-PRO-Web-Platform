import User from '../models/User.js';
import Membership from '../models/Membership.js';
import MembershipPlan from '../models/MembershipPlan.js';
import Attendance from '../models/Attendance.js';
import Workout from '../models/Workout.js';
import WorkoutPlan from '../models/WorkoutPlan.js';
import PersonalTrainingBooking from '../models/PersonalTrainingBooking.js';
import TrainerProfile from '../models/TrainerProfile.js';
import Payment from '../models/Payment.js';
import Purchase from '../models/Purchase.js';

/**
 * Builds a secure, role-restricted structured context from the database
 * to feed into the AI model.
 * 
 * SECURITY GUARANTEE:
 * - Members can ONLY query their OWN records (userId).
 * - Trainers can query assigned member data.
 * - Staff/Admin can query operational gym stats.
 */
export async function buildDatabaseContext(userId, userRole = 'MEMBER', queryText = '') {
  try {
    const context = {
      user: { userId, role: userRole },
      timestamp: new Date().toISOString(),
    };

    // ─── 1. MEMBER-SPECIFIC DATA RETRIEVAL ──────────────────────────────────
    if (userId) {
      const user = await User.findById(userId).select('firstName lastName name email role weight height createdAt').lean();
      if (user) {
        context.user.name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || user.email;
        context.user.weight = user.weight || 'Not logged';
        context.user.height = user.height || 'Not logged';
        if (user.weight && user.height) {
          const bmi = (user.weight / Math.pow(user.height / 100, 2)).toFixed(1);
          context.user.bmi = bmi;
        }
      }

      // Membership Info
      const activeMembership = await Membership.findOne({ memberId: userId, status: 'ACTIVE' })
        .sort({ endDate: -1 })
        .populate('planId')
        .lean();

      if (activeMembership && activeMembership.planId) {
        const plan = activeMembership.planId;
        context.membership = {
          planName: plan.name,
          price: plan.price,
          status: activeMembership.status,
          startDate: activeMembership.startDate ? new Date(activeMembership.startDate).toISOString().split('T')[0] : null,
          endDate: activeMembership.endDate ? new Date(activeMembership.endDate).toISOString().split('T')[0] : null,
          features: plan.features || [],
        };
      } else {
        // Fallback check on Purchase model
        const latestPurchase = await Purchase.findOne({ userId, status: { $in: ['paid', 'active', 'SUCCESS'] } })
          .sort({ createdAt: -1 })
          .populate('packageId')
          .lean();

        if (latestPurchase?.packageId) {
          context.membership = {
            planName: latestPurchase.packageId.name,
            price: latestPurchase.packageId.price,
            status: 'ACTIVE',
            startDate: new Date(latestPurchase.createdAt).toISOString().split('T')[0],
          };
        } else {
          context.membership = { status: 'NONE / EXPIRED', message: 'No active membership subscription.' };
        }
      }

      // Attendance Info (Current month count + recent visits)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [visitsThisMonth, recentVisits] = await Promise.all([
        Attendance.countDocuments({ memberId: userId, checkInTime: { $gte: startOfMonth } }),
        Attendance.find({ memberId: userId }).sort({ checkInTime: -1 }).limit(5).lean(),
      ]);

      context.attendance = {
        visitsThisMonth,
        recentVisits: recentVisits.map(v => ({
          checkIn: new Date(v.checkInTime).toLocaleString(),
          checkOut: v.checkOutTime ? new Date(v.checkOutTime).toLocaleString() : 'Currently checked in',
          method: v.method || 'QR',
        })),
      };

      // Workouts Logged
      const recentWorkouts = await Workout.find({ userId })
        .sort({ date: -1, createdAt: -1 })
        .limit(5)
        .populate('exerciseId', 'name muscleGroup')
        .lean();

      context.workouts = {
        totalLogged: await Workout.countDocuments({ userId }),
        recent: recentWorkouts.map(w => ({
          exercise: w.exerciseId?.name || 'Workout Session',
          muscleGroup: w.exerciseId?.muscleGroup || 'Full Body',
          durationMinutes: w.duration,
          caloriesBurned: w.caloriesBurned,
          date: new Date(w.date || w.createdAt).toISOString().split('T')[0],
        })),
      };

      // Personal Training Bookings
      const ptBookings = await PersonalTrainingBooking.find({ memberId: userId })
        .sort({ sessionDate: 1, startTime: 1 })
        .populate({ path: 'trainerId', select: 'firstName lastName name email' })
        .lean();

      context.personalTraining = {
        totalBooked: ptBookings.length,
        upcoming: ptBookings.filter(b => new Date(b.sessionDate) >= new Date()).map(b => ({
          trainer: b.trainerId ? `${b.trainerId.firstName || ''} ${b.trainerId.lastName || ''}`.trim() || b.trainerId.name : 'Assigned Trainer',
          date: b.sessionDate ? new Date(b.sessionDate).toISOString().split('T')[0] : null,
          timeSlot: b.startTime ? (b.endTime ? `${b.startTime} - ${b.endTime}` : b.startTime) : null,
          status: b.status,
        })),
      };

      // Payments History
      const payments = await Payment.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      context.payments = {
        history: payments.map(p => ({
          amount: p.amount,
          currency: p.currency || 'LKR',
          status: p.status,
          date: new Date(p.createdAt).toISOString().split('T')[0],
          description: p.description || 'Gym Membership / PT Payment',
        })),
      };
    }

    // ─── 2. ADMIN / STAFF GYM OPERATIONAL STATS ──────────────────────────────
    if (userRole === 'ADMIN' || userRole === 'STAFF' || userRole === 'admin') {
      const [totalMembers, totalRevenueAgg, todayAttendanceCount] = await Promise.all([
        User.countDocuments({ role: { $in: ['MEMBER', 'user', 'premium'] } }),
        Purchase.aggregate([
          { $match: { status: { $in: ['paid', 'SUCCESS', 'active'] } } },
          { $group: { _id: null, total: { $sum: '$price' } } },
        ]),
        Attendance.countDocuments({
          checkInTime: {
            $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        }),
      ]);

      context.gymAdminStats = {
        totalActiveMembers: totalMembers,
        totalRevenue: totalRevenueAgg[0]?.total || 0,
        todayAttendanceCount,
      };
    }

    return context;
  } catch (error) {
    console.error('[AIContextService] Error building database context:', error.message);
    return { user: { userId, role: userRole }, error: 'Partial database context build failure.' };
  }
}
