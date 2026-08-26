import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from '../models/User.js';
import Package from '../models/Package.js';
import MembershipPlan from '../models/MembershipPlan.js';
import Membership from '../models/Membership.js';
import TrainerAssignment from '../models/TrainerAssignment.js';
import TrainerProfile from '../models/TrainerProfile.js';
import { checkPlanIncludesPT, hasPersonalTrainerAccess } from '../utils/entitlements.js';

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
  console.log('🚀 Starting Trainer Dashboard Member Filtering & Entitlement Test Suite...\n');

  // ─── TEST 1: checkPlanIncludesPT Pure Function Logic ────────────────────────
  console.log('--- TEST 1: checkPlanIncludesPT Plan Entitlement Evaluation ---');
  
  const standardPlan = {
    name: 'Basic Gym Access',
    hasPersonalTrainer: false,
    maxPTSessions: 0,
    features: ['Gym Floor Access', 'Locker Room'],
  };
  assert(checkPlanIncludesPT(standardPlan) === false, 'Basic Gym Access plan has NO Personal Trainer entitlement');

  const ptPlan1 = {
    name: 'VIP All-Access',
    hasPersonalTrainer: true,
    features: ['Unlimited Gym', '1-on-1 Personal Trainer'],
  };
  assert(checkPlanIncludesPT(ptPlan1) === true, 'VIP All-Access with hasPersonalTrainer=true has PT entitlement');

  const ptPlan2 = {
    name: 'Standard Plus',
    hasPersonalTrainer: false,
    maxPTSessions: 8,
    features: ['Gym Access'],
  };
  assert(checkPlanIncludesPT(ptPlan2) === true, 'Standard Plus with maxPTSessions=8 has PT entitlement');

  const ptPlan3 = {
    name: 'Elite Coaching Package',
    hasPersonalTrainer: false,
    maxPTSessions: 0,
    features: ['Access to dedicated coach and customized workouts'],
  };
  assert(checkPlanIncludesPT(ptPlan3) === true, 'Elite Coaching Package detected by coach/features keyword matching');

  // ─── Database Integration Tests ─────────────────────────────────────────────
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
    console.log('\n--- TEST 2: Strict Isolation & Trainer Dashboard Member Filtering ---');
    
    // Create Coach A and Coach B
    const coachA = await User.create({
      firstName: 'CoachA',
      lastName: 'Trainer',
      email: `coacha_${Date.now()}@titanfit.local`,
      password: 'Password123!',
      role: 'TRAINER',
      isActive: true,
    });

    const coachB = await User.create({
      firstName: 'CoachB',
      lastName: 'Trainer',
      email: `coachb_${Date.now()}@titanfit.local`,
      password: 'Password123!',
      role: 'TRAINER',
      isActive: true,
    });

    await TrainerProfile.create({ userId: coachA._id, specialization: ['Strength'] });
    await TrainerProfile.create({ userId: coachB._id, specialization: ['Cardio'] });

    // 1. Member Standard (No PT plan)
    const memberStandard = await User.create({
      firstName: 'Standard',
      lastName: 'Member',
      email: `standard_${Date.now()}@test.local`,
      password: 'Password123!',
      role: 'MEMBER',
      isActive: true,
    });

    const pkgStandard = await Package.create({
      name: 'Standard Gym Access',
      description: 'Standard gym floor access package',
      price: 5000,
      duration: 30,
      hasPersonalTrainer: false,
      maxPTSessions: 0,
      features: ['Locker Room', 'Cardio Floor'],
    });

    await Membership.create({
      userId: memberStandard._id,
      memberId: memberStandard._id,
      packageId: pkgStandard._id,
      startDate: new Date(Date.now() - 86400000),
      endDate: new Date(Date.now() + 29 * 86400000),
      status: 'ACTIVE',
      paymentStatus: 'PAID',
    });

    // 2. Member Assigned to Coach A (Active PT Plan)
    const memberPTCoachA = await User.create({
      firstName: 'TraineeA',
      lastName: 'Member',
      email: `traineea_${Date.now()}@test.local`,
      password: 'Password123!',
      role: 'MEMBER',
      isActive: true,
    });

    const pkgPT = await Package.create({
      name: 'VIP Pro Personal Training',
      description: 'VIP Personal training package',
      price: 15000,
      duration: 30,
      hasPersonalTrainer: true,
      maxPTSessions: 8,
      features: ['1-on-1 Personal Trainer', 'Custom Nutrition'],
    });

    const membershipA = await Membership.create({
      userId: memberPTCoachA._id,
      memberId: memberPTCoachA._id,
      packageId: pkgPT._id,
      trainerId: coachA._id,
      startDate: new Date(Date.now() - 86400000),
      endDate: new Date(Date.now() + 29 * 86400000),
      status: 'ACTIVE',
      paymentStatus: 'PAID',
      ptSessionsUsedThisMonth: 2,
    });

    await TrainerAssignment.create({
      memberId: memberPTCoachA._id,
      trainerId: coachA._id,
      membershipId: membershipA._id,
      packageId: pkgPT._id,
      status: 'ACTIVE',
    });

    // 3. Member Assigned to Coach B (Active PT Plan)
    const memberPTCoachB = await User.create({
      firstName: 'TraineeB',
      lastName: 'Member',
      email: `traineeb_${Date.now()}@test.local`,
      password: 'Password123!',
      role: 'MEMBER',
      isActive: true,
    });

    const membershipB = await Membership.create({
      userId: memberPTCoachB._id,
      memberId: memberPTCoachB._id,
      packageId: pkgPT._id,
      trainerId: coachB._id,
      startDate: new Date(Date.now() - 86400000),
      endDate: new Date(Date.now() + 29 * 86400000),
      status: 'ACTIVE',
      paymentStatus: 'PAID',
    });

    await TrainerAssignment.create({
      memberId: memberPTCoachB._id,
      trainerId: coachB._id,
      membershipId: membershipB._id,
      packageId: pkgPT._id,
      status: 'ACTIVE',
    });

    // 4. Member with Expired PT Membership
    const memberExpired = await User.create({
      firstName: 'Expired',
      lastName: 'Member',
      email: `expired_${Date.now()}@test.local`,
      password: 'Password123!',
      role: 'MEMBER',
      isActive: true,
    });

    await Membership.create({
      userId: memberExpired._id,
      memberId: memberExpired._id,
      packageId: pkgPT._id,
      trainerId: coachA._id,
      startDate: new Date(Date.now() - 60 * 86400000),
      endDate: new Date(Date.now() - 5 * 86400000), // Expired 5 days ago
      status: 'EXPIRED',
      paymentStatus: 'PAID',
    });

    await TrainerAssignment.create({
      memberId: memberExpired._id,
      trainerId: coachA._id,
      status: 'ACTIVE', // Stray active assignment after expiration
    });

    // ─── RUN VERIFICATIONS ──────────────────────────────────────────────────
    
    // Check Standard Member
    const entStandard = await hasPersonalTrainerAccess(memberStandard._id);
    assert(entStandard.hasAccess === false, 'Standard Member without PT plan returns hasAccess: false');
    assert(entStandard.reason === 'PLAN_DOES_NOT_INCLUDE_PT', 'Reason is correctly PLAN_DOES_NOT_INCLUDE_PT');

    // Check Member Trainee A
    const entA = await hasPersonalTrainerAccess(memberPTCoachA._id);
    assert(entA.hasAccess === true, 'Member Trainee A with active VIP package has hasAccess: true');
    assert(entA.trainer !== null, 'Member Trainee A has an assigned trainer');
    assert(entA.trainer.userId.toString() === coachA._id.toString(), 'Member Trainee A is assigned to Coach A');

    // Check Member Trainee B
    const entB = await hasPersonalTrainerAccess(memberPTCoachB._id);
    assert(entB.hasAccess === true, 'Member Trainee B has PT access');
    assert(entB.trainer.userId.toString() === coachB._id.toString(), 'Member Trainee B is assigned to Coach B');
    assert(entB.trainer.userId.toString() !== coachA._id.toString(), 'Member Trainee B is NOT assigned to Coach A');

    // Check Expired Member
    const entExpired = await hasPersonalTrainerAccess(memberExpired._id);
    assert(entExpired.hasAccess === false, 'Expired Member returns hasAccess: false despite active assignment');

    // ─── Simulate getCoachTrainingSpace Trainee Filtering for Coach A ───────
    console.log('\n--- TEST 3: Simulate getCoachTrainingSpace Trainee Filtering ---');

    const assignmentsCoachA = await TrainerAssignment.find({
      trainerId: coachA._id,
      status: 'ACTIVE',
    }).populate('memberId').lean();

    const activeTraineesForCoachA = [];
    for (const a of assignmentsCoachA) {
      if (!a.memberId || !a.memberId._id) continue;
      const entitlement = await hasPersonalTrainerAccess(a.memberId._id);
      if (!entitlement.hasAccess) continue;
      if (!entitlement.trainer || entitlement.trainer.userId.toString() !== coachA._id.toString()) continue;
      activeTraineesForCoachA.push({
        id: a.memberId._id,
        name: a.memberId.firstName,
      });
    }

    assert(activeTraineesForCoachA.length === 1, 'Coach A sees exactly 1 active trainee');
    assert(activeTraineesForCoachA[0].id.toString() === memberPTCoachA._id.toString(), 'Coach A only sees Member Trainee A');
    assert(!activeTraineesForCoachA.some(t => t.id.toString() === memberStandard._id.toString()), 'Standard member is completely excluded');
    assert(!activeTraineesForCoachA.some(t => t.id.toString() === memberPTCoachB._id.toString()), 'Coach B trainee is completely excluded');
    assert(!activeTraineesForCoachA.some(t => t.id.toString() === memberExpired._id.toString()), 'Expired member is completely excluded');

    // Clean up test data
    console.log('\n🧹 Cleaning up test database records...');
    await TrainerAssignment.deleteMany({
      memberId: { $in: [memberStandard._id, memberPTCoachA._id, memberPTCoachB._id, memberExpired._id] }
    });
    await Membership.deleteMany({
      userId: { $in: [memberStandard._id, memberPTCoachA._id, memberPTCoachB._id, memberExpired._id] }
    });
    await Package.deleteMany({ _id: { $in: [pkgStandard._id, pkgPT._id] } });
    await TrainerProfile.deleteMany({ userId: { $in: [coachA._id, coachB._id] } });
    await User.deleteMany({
      _id: { $in: [coachA._id, coachB._id, memberStandard._id, memberPTCoachA._id, memberPTCoachB._id, memberExpired._id] }
    });
  }

  console.log(`\n========================================`);
  console.log(`🎉 ALL ${passedTests} / ${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log(`========================================\n`);

  process.exit(0);
}

runTests();
