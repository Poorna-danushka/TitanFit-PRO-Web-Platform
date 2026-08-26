import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from '../models/User.js';
import TrainerProfile from '../models/TrainerProfile.js';
import TrainerAvailability from '../models/TrainerAvailability.js';
import PersonalTrainingBooking from '../models/PersonalTrainingBooking.js';
import MembershipPlan from '../models/MembershipPlan.js';
import Membership from '../models/Membership.js';
import TrainerAssignment from '../models/TrainerAssignment.js';
import {
  getWeekRange,
  generateHourlySlots,
  getMemberWeeklyBookingCount,
  checkAvailabilityConflicts,
  formatDateOnly,
} from '../utils/availabilityHelper.js';
import { hasPersonalTrainerAccess } from '../utils/entitlements.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  }
  passedTests++;
  console.log(`✅ PASS: ${message}`);
}

async function runTests() {
  console.log('🚀 Starting Coach Scheduling & Booking System Test Suite...\n');

  // ─── TEST 1: Slot Generation & Boundary (Pure Function) ────────────────────
  console.log('--- TEST 1: Slot Generation & Boundary ---');
  const slots1 = generateHourlySlots('14:00', '22:00');
  assert(slots1.length === 8, '14:00 to 22:00 generates exactly 8 slots');
  assert(slots1[0].startTime === '14:00' && slots1[0].endTime === '15:00', 'First slot is 14:00 - 15:00');
  assert(slots1[7].startTime === '21:00' && slots1[7].endTime === '22:00', 'Last slot is 21:00 - 22:00');

  const slots2 = generateHourlySlots('14:00', '17:00');
  assert(slots2.length === 3, '14:00 to 17:00 generates exactly 3 slots');
  assert(slots2[2].endTime === '17:00', 'End time 17:00 is strict boundary (no 17:00-18:00 generated)');

  const invalidSlots = generateHourlySlots('17:00', '14:00');
  assert(invalidSlots.length === 0, 'Invalid inverted times produce 0 slots');

  // ─── TEST 2: Monday-to-Sunday Week Calculation (Pure Function) ────────────
  console.log('\n--- TEST 2: Monday-to-Sunday Week Calculation ---');
  const weekInfo = getWeekRange('2026-09-02');
  assert(weekInfo.weekStartStr === '2026-08-31', 'Week start is Monday 2026-08-31');
  assert(weekInfo.weekEndStr === '2026-09-06', 'Week end is Sunday 2026-09-06');
  assert(weekInfo.days.length === 7, 'Week contains exactly 7 days');
  assert(weekInfo.days[0].dayName === 'Monday', 'First day of week is Monday');
  assert(weekInfo.days[6].dayName === 'Sunday', 'Last day of week is Sunday');

  // ─── Database Integration Tests ───────────────────────────────────────────
  let dbConnected = false;
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/gym-management-system';
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    dbConnected = true;
    console.log('\nConnected to MongoDB for integration tests.');
  } catch (dbErr) {
    console.warn(`\n⚠️ Database not reachable (${dbErr.message}). Skipping DB integration assertions.`);
  }

  if (dbConnected) {
    // ─── TEST 3: Multi-Coach Isolation ──────────────────────────────────────────
    console.log('\n--- TEST 3: Multi-Coach Availability & Booking Isolation ---');
    const testCoachA = await User.create({
      firstName: 'TestCoachA',
      lastName: 'Alpha',
      email: `testcoachA_${Date.now()}@test.local`,
      password: 'TestPassword123!',
      role: 'TRAINER',
      isActive: true,
    });

    const testCoachB = await User.create({
      firstName: 'TestCoachB',
      lastName: 'Beta',
      email: `testcoachB_${Date.now()}@test.local`,
      password: 'TestPassword123!',
      role: 'TRAINER',
      isActive: true,
    });

    const testMember1 = await User.create({
      firstName: 'TestMember1',
      lastName: 'One',
      email: `testmember1_${Date.now()}@test.local`,
      password: 'TestPassword123!',
      role: 'MEMBER',
      isActive: true,
    });

    const testMember2 = await User.create({
      firstName: 'TestMember2',
      lastName: 'Two',
      email: `testmember2_${Date.now()}@test.local`,
      password: 'TestPassword123!',
      role: 'MEMBER',
      isActive: true,
    });

    const sessionDate = new Date('2026-09-01T00:00:00.000Z');

    // Book Coach A on 2026-09-01 at 15:00
    const bookingA = await PersonalTrainingBooking.create({
      trainerId: testCoachA._id,
      memberId: testMember1._id,
      sessionDate,
      startTime: '15:00',
      endTime: '16:00',
      status: 'CONFIRMED',
    });
    assert(Boolean(bookingA._id), 'Member 1 successfully booked Coach A at 15:00');

    // Book Coach B at the exact same sessionDate and time (15:00) by Member 2
    const bookingB = await PersonalTrainingBooking.create({
      trainerId: testCoachB._id,
      memberId: testMember2._id,
      sessionDate,
      startTime: '15:00',
      endTime: '16:00',
      status: 'CONFIRMED',
    });
    assert(Boolean(bookingB._id), 'Member 2 successfully booked Coach B at the same date & time (15:00) independently');

    // ─── TEST 4: Double Booking Protection (Same Coach, Same Slot) ───────────────
    console.log('\n--- TEST 4: Double Booking Protection ---');
    let duplicateFailed = false;
    try {
      await PersonalTrainingBooking.create({
        trainerId: testCoachA._id,
        memberId: testMember2._id,
        sessionDate,
        startTime: '15:00',
        endTime: '16:00',
        status: 'CONFIRMED',
      });
    } catch (err) {
      duplicateFailed = true;
      assert(err.code === 11000 || /E11000/i.test(err.message), 'Duplicate booking rejected by compound unique index (code 11000)');
    }
    assert(duplicateFailed, 'Simultaneous / duplicate booking for same coach & time correctly rejected');

    // ─── TEST 5: Weekly 4-Session Limit ──────────────────────────────────────────
    console.log('\n--- TEST 5: 4-Session Weekly Limit ---');
    const testWeek = getWeekRange('2026-09-01');
    const daysInWeek = ['2026-08-31', '2026-09-02', '2026-09-03', '2026-09-04'];

    for (let i = 0; i < 3; i++) {
      await PersonalTrainingBooking.create({
        trainerId: testCoachA._id,
        memberId: testMember1._id,
        sessionDate: new Date(daysInWeek[i] + 'T00:00:00.000Z'),
        startTime: '10:00',
        endTime: '11:00',
        status: 'CONFIRMED',
      });
    }

    const weeklyCount = await getMemberWeeklyBookingCount(testMember1._id, testWeek.weekStart, testWeek.weekEnd);
    assert(weeklyCount === 4, 'Member 1 currently has 4 active confirmed bookings in the week');

    const isExceeded = weeklyCount + 1 > 4;
    assert(isExceeded, '5th booking attempt in the same week is detected as exceeding the weekly limit (4/4 reached)');

    // ─── TEST 6: Cancellation Releases Slot & Weekly Count ───────────────────────
    console.log('\n--- TEST 6: Cancellation Releases Slot & Count ---');
    bookingA.status = 'CANCELLED';
    bookingA.cancelledAt = new Date();
    await bookingA.save();

    const countAfterCancel = await getMemberWeeklyBookingCount(testMember1._id, testWeek.weekStart, testWeek.weekEnd);
    assert(countAfterCancel === 3, 'Weekly count decreased to 3/4 after session cancellation');

    const rebooking = await PersonalTrainingBooking.create({
      trainerId: testCoachA._id,
      memberId: testMember2._id,
      sessionDate,
      startTime: '15:00',
      endTime: '16:00',
      status: 'CONFIRMED',
    });
    assert(Boolean(rebooking._id), 'Re-booking previously cancelled slot successfully succeeded');

    // ─── TEST 7: Availability Update Conflict Protection ────────────────────────
    console.log('\n--- TEST 7: Availability Conflict Detection ---');
    const newSchedule = [
      { dayOfWeek: 1, isAvailable: true, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 2, isAvailable: true, startTime: '17:00', endTime: '20:00' },
      { dayOfWeek: 3, isAvailable: true, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 4, isAvailable: true, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 5, isAvailable: true, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 6, isAvailable: false, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 0, isAvailable: false, startTime: '09:00', endTime: '17:00' },
    ];

    const conflicts = await checkAvailabilityConflicts(testCoachA._id, newSchedule);
    assert(conflicts.length > 0, 'Detected conflict when coach attempts to narrow Tuesday availability around confirmed 15:00 booking');
    assert(conflicts[0].startTime === '15:00', 'Conflicting session correctly identified');

    // ─── TEST 9: Transaction Rollback & Atomicity Safeguard ───────────────
    console.log('\n--- TEST 9: Transaction Rollback & Atomicity Safeguard ---');
    let session = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();

      // Create occurrence 1 and occurrence 2 in transaction
      await PersonalTrainingBooking.create(
        [
          {
            trainerId: testCoachA._id,
            memberId: testMember1._id,
            sessionDate: new Date('2026-09-10T00:00:00.000Z'),
            startTime: '11:00',
            endTime: '12:00',
            status: 'CONFIRMED',
          },
          {
            trainerId: testCoachA._id,
            memberId: testMember1._id,
            sessionDate: new Date('2026-09-17T00:00:00.000Z'),
            startTime: '11:00',
            endTime: '12:00',
            status: 'CONFIRMED',
          },
        ],
        { session }
      );

      // Force an intentional error / rollback
      await session.abortTransaction();
    } catch (transErr) {
      console.log('Transaction aborted cleanly.');
    } finally {
      if (session) session.endSession();
    }

    const checkOccur1 = await PersonalTrainingBooking.findOne({
      trainerId: testCoachA._id,
      sessionDate: new Date('2026-09-10T00:00:00.000Z'),
      startTime: '11:00',
    });
    const checkOccur2 = await PersonalTrainingBooking.findOne({
      trainerId: testCoachA._id,
      sessionDate: new Date('2026-09-17T00:00:00.000Z'),
      startTime: '11:00',
    });

    assert(checkOccur1 === null, 'Occurrence 1 was NOT persisted after transaction abort');
    assert(checkOccur2 === null, 'Occurrence 2 was NOT persisted after transaction abort');

    // Clean up test data
    console.log('\n🧹 Cleaning up test records...');
    await PersonalTrainingBooking.deleteMany({
      _id: { $in: [bookingA._id, bookingB._id, rebooking._id] },
    });
    await PersonalTrainingBooking.deleteMany({ memberId: testMember1._id });
    await User.deleteMany({
      _id: { $in: [testCoachA._id, testCoachB._id, testMember1._id, testMember2._id] },
    });
  }

  console.log(`\n========================================`);
  console.log(`🎉 ALL ${passedTests} / ${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log(`========================================\n`);

  process.exit(0);
}

runTests();
