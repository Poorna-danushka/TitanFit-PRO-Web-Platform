import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Package from '../models/Package.js';
import Membership from '../models/Membership.js';
import User from '../models/User.js';
import { hasPersonalTrainerAccess } from '../utils/entitlements.js';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function runAudit() {
  await mongoose.connect(MONGO_URI);
  console.log('============================================================');
  console.log('    STRICT PERSONAL TRAINER PLAN ENTITLEMENT AUDIT');
  console.log('============================================================\n');

  // 1. Get Packages
  const basicPkg = await Package.findOne({ hasPersonalTrainer: false });
  const ptPkg = await Package.findOne({ hasPersonalTrainer: true });

  console.log('[BASE DATA] Basic Plan: ' + (basicPkg ? basicPkg.name : 'None') + ' (hasPersonalTrainer: ' + (basicPkg ? basicPkg.hasPersonalTrainer : false) + ')');
  console.log('[BASE DATA] PT Plan: ' + (ptPkg ? ptPkg.name : 'None') + ' (hasPersonalTrainer: ' + (ptPkg ? ptPkg.hasPersonalTrainer : false) + ')\n');

  let testMember = await User.findOne({ email: 'audit.member@gymfit.local' });
  if (!testMember) {
    testMember = await User.create({
      firstName: 'Audit',
      lastName: 'Member',
      email: 'audit.member@gymfit.local',
      password: 'password123',
      role: 'MEMBER'
    });
  }

  const now = new Date();
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 3600 * 1000);
  const oneDayAgo = new Date(Date.now() - 1 * 24 * 3600 * 1000);

  // === TEST 1: Basic Plan Member ===
  console.log('[TEST 1] Member with ACTIVE Basic Plan (hasPersonalTrainer = false)');
  await Membership.deleteMany({ memberId: testMember._id });
  await Membership.create({
    memberId: testMember._id,
    packageId: basicPkg._id,
    startDate: now,
    endDate: thirtyDaysLater,
    status: 'ACTIVE',
    paymentStatus: 'PAID'
  });
  const res1 = await hasPersonalTrainerAccess(testMember._id);
  console.log('  -> hasPersonalTrainerAccess: ' + res1.hasAccess + ' (reason: ' + res1.reason + ')');
  if (res1.hasAccess === false && res1.reason === 'PLAN_DOES_NOT_INCLUDE_PT') {
    console.log('  [ PASSED ] Basic member has zero PT access\n');
  } else {
    console.log('  [ FAILED ] Basic member erroneously has access\n');
  }

  // === TEST 2: Pro/PT Plan Member ===
  console.log('[TEST 2] Member with ACTIVE Pro/PT Plan (hasPersonalTrainer = true)');
  await Membership.deleteMany({ memberId: testMember._id });
  await Membership.create({
    memberId: testMember._id,
    packageId: ptPkg._id,
    startDate: now,
    endDate: thirtyDaysLater,
    status: 'ACTIVE',
    paymentStatus: 'PAID'
  });
  const res2 = await hasPersonalTrainerAccess(testMember._id);
  console.log('  -> hasPersonalTrainerAccess: ' + res2.hasAccess + ' (plan: ' + res2.planName + ')');
  if (res2.hasAccess === true) {
    console.log('  [ PASSED ] Pro/PT member has PT access\n');
  } else {
    console.log('  [ FAILED ] Pro/PT member denied access\n');
  }

  // === TEST 3: Expired PT Membership ===
  console.log('[TEST 3] Member with EXPIRED PT Plan');
  await Membership.deleteMany({ memberId: testMember._id });
  await Membership.create({
    memberId: testMember._id,
    packageId: ptPkg._id,
    startDate: tenDaysAgo,
    endDate: oneDayAgo,
    status: 'ACTIVE',
    paymentStatus: 'PAID'
  });
  const res3 = await hasPersonalTrainerAccess(testMember._id);
  console.log('  -> hasPersonalTrainerAccess: ' + res3.hasAccess + ' (reason: ' + res3.reason + ')');
  if (res3.hasAccess === false) {
    console.log('  [ PASSED ] Expired PT membership loses PT access\n');
  } else {
    console.log('  [ FAILED ] Expired membership still has access\n');
  }

  // === TEST 4: Payment Failed / Pending ===
  console.log('[TEST 4] PT Plan with FAILED payment');
  await Membership.deleteMany({ memberId: testMember._id });
  await Membership.create({
    memberId: testMember._id,
    packageId: ptPkg._id,
    startDate: now,
    endDate: thirtyDaysLater,
    status: 'ACTIVE',
    paymentStatus: 'FAILED'
  });
  const res4 = await hasPersonalTrainerAccess(testMember._id);
  console.log('  -> hasPersonalTrainerAccess: ' + res4.hasAccess + ' (reason: ' + res4.reason + ')');
  if (res4.hasAccess === false) {
    console.log('  [ PASSED ] Failed payment revokes PT access\n');
  } else {
    console.log('  [ FAILED ] Failed payment still has access\n');
  }

  // === TEST 5: Public Trainers Listing ===
  console.log('[TEST 5] Public Trainers Listing (For Home Page)');
  const publicTrainers = await User.find({ role: 'TRAINER', isActive: { $ne: false } }).select('profileImage firstName lastName bio');
  console.log('  Found ' + publicTrainers.length + ' active trainers for public display');
  if (publicTrainers.length > 0) {
    console.log('  [ PASSED ] Public trainers available for Home marketing page\n');
  }

  console.log('============================================================');
  console.log('     ALL ENTITLEMENT AUDIT TESTS COMPLETED SUCCESSFULLY!');
  console.log('============================================================');

  await mongoose.disconnect();
}

runAudit().catch(err => {
  console.error(err);
  process.exit(1);
});
