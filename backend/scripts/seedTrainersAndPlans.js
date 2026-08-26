import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Package from '../models/Package.js';
import MembershipPlan from '../models/MembershipPlan.js';
import User from '../models/User.js';
import TrainerProfile from '../models/TrainerProfile.js';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/gymfit_pro';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const existingPackages = await Package.find();
  console.log(`Found ${existingPackages.length} packages`);

  if (existingPackages.length === 0) {
    await Package.create([
      {
        name: 'Starter Fitness Plan',
        price: 4500,
        duration: '1 Month',
        durationMonths: 1,
        description: 'Full gym floor access, standard equipment, locker room and mobile workout tracking.',
        level: 'beginner',
        hasPersonalTrainer: false,
        maxPTSessions: 0,
        benefits: ['Standard Gym Access', 'Locker Room Access', 'Workout App Tracking', 'Free Water Station'],
        isActive: true,
      },
      {
        name: 'Pro Athlete + Personal Trainer',
        price: 14500,
        duration: '1 Month',
        durationMonths: 1,
        description: 'Unlimited gym access plus dedicated 1-on-1 Certified Personal Trainer (8 sessions/mo).',
        level: 'intermediate',
        hasPersonalTrainer: true,
        maxPTSessions: 8,
        benefits: [
          'Unlimited 24/7 Gym Access',
          'Dedicated Personal Trainer (8 Sessions)',
          'Custom Workout & Nutrition Plan',
          'Body Composition Analytics',
          'Sauna & Recovery Lounge',
        ],
        isActive: true,
      },
      {
        name: 'VIP Elite Coaching Plan',
        price: 26500,
        duration: '1 Month',
        durationMonths: 1,
        description: 'Elite 1-on-1 personal coaching (16 sessions/mo), biometric scans, and priority booking.',
        level: 'advanced',
        hasPersonalTrainer: true,
        maxPTSessions: 16,
        benefits: [
          'Unlimited VIP Gym & Spa Access',
          '16 1-on-1 Personal Trainer Sessions',
          'Weekly Body Fat & DEXA Scan',
          'Personalized Meal Prep Guidance',
          'Priority Slot Booking & Towel Service',
        ],
        isActive: true,
      },
    ]);
    console.log('Sample packages created!');
  } else {
    for (const pkg of existingPackages) {
      const isPT = /pro|vip|elite|trainer/i.test(pkg.name) || (pkg.benefits || []).some(b => /trainer|1-on-1|pt/i.test(b));
      pkg.hasPersonalTrainer = isPT;
      pkg.maxPTSessions = isPT ? 8 : 0;
      await pkg.save();
      console.log(`Updated package ${pkg.name}: hasPersonalTrainer = ${isPT}`);
    }
  }

  const trainers = await User.find({ role: 'TRAINER' });
  console.log(`Found ${trainers.length} trainers`);

  if (trainers.length === 0) {
    console.log('No trainers found, please create a trainer user');
  } else {
    for (const t of trainers) {
      let profile = await TrainerProfile.findOne({ userId: t._id });
      if (!profile) {
        profile = await TrainerProfile.create({
          userId: t._id,
          qualification: 'Certified Personal Trainer',
          certifications: ['NASM CPT', 'CPR/AED Certified', 'CSCS Strength Specialist'],
          experience: 5,
          specialization: ['Hypertrophy', 'Strength & Conditioning', 'Body Recomposition'],
          bio: t.bio || 'Dedicated fitness trainer helping athletes achieve peak physical form.',
          hourlyRate: 4500,
          rating: 4.9,
          reviewsCount: 18,
          isAvailable: true,
        });
        console.log(`Created TrainerProfile for ${t.email}`);
      }
    }
  }

  await mongoose.disconnect();
  console.log('Seed completed successfully!');
}

seed().catch(err => { console.error(err); process.exit(1); });
