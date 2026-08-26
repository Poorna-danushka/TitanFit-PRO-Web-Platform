import User from '../models/User.js';
import Membership from '../models/Membership.js';
import MembershipPlan from '../models/MembershipPlan.js';
import Attendance from '../models/Attendance.js';
import PersonalTrainingBooking from '../models/PersonalTrainingBooking.js';
import TrainerProfile from '../models/TrainerProfile.js';
import Payment from '../models/Payment.js';
import Purchase from '../models/Purchase.js';
import Package from '../models/Package.js';
import { calculateMembershipEndDate } from '../utils/membershipHelper.js';

/**
 * Builds a secure, role-restricted structured context from the database
 * to feed into the AI model.
 */
export async function buildDatabaseContext(userId, userRole = 'MEMBER', queryText = '') {
  try {
    const context = {
      user: { userId, role: userRole },
      timestamp: new Date().toISOString(),
    };

    const now = new Date();

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

      // Auto-expire active memberships whose endDate <= now
      await Membership.updateMany(
        { $or: [{ userId }, { memberId: userId }], status: 'ACTIVE', endDate: { $lte: now } },
        { status: 'EXPIRED' }
      ).catch(() => {});

      // Find active membership
      const activeMembership = await Membership.findOne({
        $or: [{ userId }, { memberId: userId }],
        status: 'ACTIVE',
        endDate: { $gt: now },
      })
        .sort({ endDate: -1 })
        .populate('packageId')
        .populate('planId')
        .lean();

      if (activeMembership) {
        const pkg = activeMembership.packageId || activeMembership.planId;
        const endDateObj = new Date(activeMembership.endDate);
        const daysRemaining = Math.max(0, Math.ceil((endDateObj - now) / (1000 * 60 * 60 * 24)));

        context.membership = {
          planName: pkg?.name || 'Gym Membership',
          price: pkg?.price || 0,
          status: 'ACTIVE',
          startDate: activeMembership.startDate ? new Date(activeMembership.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A',
          endDate: endDateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          expiredAt: endDateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          daysRemaining,
          features: pkg?.benefits || pkg?.features || ['Gym Floor Access'],
        };
      } else {
        // Fallback: Check latest expired / cancelled membership
        const latestExpired = await Membership.findOne({
          $or: [{ userId }, { memberId: userId }],
        })
          .sort({ createdAt: -1 })
          .populate('packageId')
          .populate('planId')
          .lean();

        if (latestExpired) {
          const pkg = latestExpired.packageId || latestExpired.planId;
          const endDateObj = latestExpired.endDate ? new Date(latestExpired.endDate) : null;
          context.membership = {
            planName: pkg?.name || 'Gym Membership',
            price: pkg?.price || 0,
            status: latestExpired.status || 'EXPIRED',
            startDate: latestExpired.startDate ? new Date(latestExpired.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A',
            endDate: endDateObj ? endDateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A',
            expiredAt: endDateObj ? endDateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A',
            daysRemaining: 0,
            features: pkg?.benefits || pkg?.features || ['Gym Floor Access'],
          };
        } else {
          // Fallback check on Purchase model
          const latestPurchase = await Purchase.findOne({ userId, status: { $in: ['paid', 'active', 'SUCCESS'] } })
            .sort({ createdAt: -1 })
            .populate('packageId')
            .lean();

          if (latestPurchase?.packageId) {
            const pkg = latestPurchase.packageId;
            const startDate = new Date(latestPurchase.createdAt);
            const endDate = calculateMembershipEndDate(startDate, pkg);
            const isExpired = endDate <= now;
            const daysRemaining = isExpired ? 0 : Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));

            context.membership = {
              planName: pkg.name,
              price: pkg.price || 0,
              status: isExpired ? 'EXPIRED' : 'ACTIVE',
              startDate: startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              endDate: endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              expiredAt: endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
              daysRemaining,
              features: pkg.benefits || ['Gym Floor Access'],
            };
          } else {
            context.membership = { status: 'NONE / EXPIRED', message: 'No active membership subscription.' };
          }
        }
      }

      // Attendance Info (Current month count + recent visits)
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [visitsThisMonth, recentVisits] = await Promise.all([
        Attendance.countDocuments({ memberId: userId, checkInTime: { $gte: startOfMonth } }),
        Attendance.find({ memberId: userId }).sort({ checkInTime: -1 }).limit(5).lean(),
      ]);

      context.attendance = {
        visitsThisMonth,
        recentVisits: recentVisits.map((v) => ({
          checkIn: new Date(v.checkInTime).toLocaleString(),
          checkOut: v.checkOutTime ? new Date(v.checkOutTime).toLocaleString() : 'Currently checked in',
          method: v.method || 'QR',
        })),
      };

      // Personal Training Bookings
      const ptBookings = await PersonalTrainingBooking.find({ memberId: userId })
        .sort({ sessionDate: 1, startTime: 1 })
        .populate({ path: 'trainerId', select: 'firstName lastName name email' })
        .lean();

      context.personalTraining = {
        totalBooked: ptBookings.length,
        upcoming: ptBookings
          .filter((b) => new Date(b.sessionDate) >= now)
          .map((b) => ({
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
        history: payments.map((p) => ({
          amount: p.amount,
          currency: p.currency || 'LKR',
          status: p.status,
          date: new Date(p.createdAt).toISOString().split('T')[0],
          description: p.description || 'Gym Membership / PT Payment',
        })),
      };
    }

    // ─── 2. ALWAYS INCLUDE ALL AVAILABLE GYM PACKAGES ──────────────────────
    const allPackages = await Package.find().lean();
    context.availablePlans = allPackages.map((p) => ({
      name: p.name,
      price: p.price,
      duration: p.duration || '1 Month',
      description: p.description || '',
      isFamilyPackage: Boolean(p.isFamilyPackage || p.name?.toLowerCase().includes('family')),
      hasPersonalTrainer: Boolean(p.hasPersonalTrainer),
      benefits: p.benefits || [],
    }));

    // ─── 3. ADMIN / STAFF GYM OPERATIONAL STATS ──────────────────────────────
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
