import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

// Import required models
import User from '../models/User.js';
import MemberProfile from '../models/MemberProfile.js';
import TrainerProfile from '../models/TrainerProfile.js';
import MembershipPlan from '../models/MembershipPlan.js';
import Membership from '../models/Membership.js';
import Package from '../models/Package.js';
import Exercise from '../models/Exercise.js';
import Workout from '../models/Workout.js';
import Attendance from '../models/Attendance.js';
import MemberQRCode from '../models/MemberQRCode.js';
import PersonalTrainingPackage from '../models/PersonalTrainingPackage.js';
import PersonalTrainingBooking from '../models/PersonalTrainingBooking.js';
import Payment from '../models/Payment.js';
import AIConfiguration from '../models/AIConfiguration.js';
import QRCode from 'qrcode';

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding for Complete Gym Management System...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gym-management-system', {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing data safely
    console.log('🗑️ Clearing existing database collections...');
    await Promise.all([
      User.deleteMany({}),
      MemberProfile.deleteMany({}),
      TrainerProfile.deleteMany({}),
      MembershipPlan.deleteMany({}),
      Membership.deleteMany({}),
      Package.deleteMany({}),
      Exercise.deleteMany({}),
      Workout.deleteMany({}),
      Attendance.deleteMany({}),
      MemberQRCode.deleteMany({}),
      PersonalTrainingPackage.deleteMany({}),
      PersonalTrainingBooking.deleteMany({}),
      Payment.deleteMany({}),
      AIConfiguration.deleteMany({}),
    ]);
    console.log('✅ Collections reset cleanly');

    // ============ 1. SYSTEM ADMIN & ADMIN USERS ============
    console.log('👤 Creating system admin & admin users...');
    const systemAdmin = await User.create({
      firstName: 'Poorna',
      lastName: 'Danushka',
      name: 'Poorna Danushka',
      email: 'poornadanushka2@gmail.com',
      password: 'ilikeit@',
      phone: '+94771234567',
      role: 'SYSTEM_ADMIN',
      isSystemAdmin: true,
      isEmailVerified: true,
      isActive: true,
    });

    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      name: 'Admin User',
      email: 'admin@gym.local',
      password: 'Admin@123456',
      phone: '+94123456789',
      role: 'ADMIN',
      isSystemAdmin: false,
      isEmailVerified: true,
      isActive: true,
    });

    // ============ 2. STAFF USERS ============
    console.log('👥 Creating staff users...');
    const staff1 = await User.create({
      firstName: 'Reception',
      lastName: 'Staff',
      email: 'reception@gym.local',
      password: 'Staff@123456',
      phone: '+94123456790',
      role: 'STAFF',
      isEmailVerified: true,
      isActive: true,
    });

    const staff2 = await User.create({
      firstName: 'Manager',
      lastName: 'User',
      email: 'manager@gym.local',
      password: 'Manager@123456',
      phone: '+94123456791',
      role: 'STAFF',
      isEmailVerified: true,
      isActive: true,
    });

    // ============ 3. TRAINERS ============
    console.log('🏋️ Creating personal trainers...');
    const trainer1 = await User.create({
      firstName: 'John',
      lastName: 'Trainer',
      email: 'john.trainer@gym.local',
      password: 'Trainer@123456',
      phone: '+94712345678',
      role: 'TRAINER',
      profileImage: 'https://ui-avatars.com/api/?name=John+Trainer&background=7c3aed&color=fff',
      isEmailVerified: true,
      isActive: true,
    });

    const trainer2 = await User.create({
      firstName: 'Sarah',
      lastName: 'Fitness',
      email: 'sarah.fitness@gym.local',
      password: 'Trainer@123456',
      phone: '+94712345679',
      role: 'TRAINER',
      profileImage: 'https://ui-avatars.com/api/?name=Sarah+Fitness&background=7c3aed&color=fff',
      isEmailVerified: true,
      isActive: true,
    });

    const trainer3 = await User.create({
      firstName: 'Mike',
      lastName: 'Coach',
      email: 'mike.coach@gym.local',
      password: 'Trainer@123456',
      phone: '+94712345680',
      role: 'TRAINER',
      profileImage: 'https://ui-avatars.com/api/?name=Mike+Coach&background=7c3aed&color=fff',
      isEmailVerified: true,
      isActive: true,
    });

    // Trainer Profiles
    await TrainerProfile.create([
      {
        userId: trainer1._id,
        qualification: 'NASM Certified Personal Trainer',
        certifications: ['NASM-CPT', 'Hypertrophy Specialist'],
        experience: 6,
        specialization: ['Strength Training', 'Muscle Building', 'Bodybuilding'],
        bio: 'Specialized in heavy compound lifting, hypertrophy, and physical transformations.',
        hourlyRate: 5000,
        rating: 4.9,
        reviewsCount: 48,
        isAvailable: true,
      },
      {
        userId: trainer2._id,
        qualification: 'ACE Certified Personal Trainer',
        certifications: ['ACE-CPT', 'Functional Strength Instructor'],
        experience: 8,
        specialization: ['Weight Loss', 'Flexibility', 'Body Recomposition'],
        bio: 'Expert in sustainable weight loss, functional strength, and mobility.',
        hourlyRate: 4500,
        rating: 4.8,
        reviewsCount: 62,
        isAvailable: true,
      },
      {
        userId: trainer3._id,
        qualification: 'ISSA Certified Personal Trainer',
        certifications: ['ISSA-CPT', 'Athletic Conditioning'],
        experience: 5,
        specialization: ['Cardio Endurance', 'HIIT', 'Core Stability'],
        bio: 'High energy coach focused on conditioning and athletic performance.',
        hourlyRate: 4000,
        rating: 4.7,
        reviewsCount: 39,
        isAvailable: true,
      },
    ]);

    // ============ 4. MEMBERS ============
    console.log('👥 Creating member accounts & QR codes...');
    const members = [];
    const memberEmails = [
      'alice.johnson@email.com',
      'bob.smith@email.com',
      'carol.williams@email.com',
      'david.brown@email.com',
      'eve.davis@email.com',
      'frank.miller@email.com',
      'grace.wilson@email.com',
      'henry.moore@email.com',
      'iris.taylor@email.com',
      'jack.anderson@email.com',
    ];

    for (let i = 0; i < memberEmails.length; i++) {
      const email = memberEmails[i];
      const firstName = email.split('.')[0];
      const lastName = email.split('.')[1].split('@')[0];
      
      const member = await User.create({
        firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
        lastName: lastName.charAt(0).toUpperCase() + lastName.slice(1),
        name: `${firstName.charAt(0).toUpperCase() + firstName.slice(1)} ${lastName.charAt(0).toUpperCase() + lastName.slice(1)}`,
        email,
        password: 'Member@123456',
        phone: `+9471234567${i}`,
        weight: 65 + (i * 2),
        height: 170 + (i % 5),
        role: 'MEMBER',
        profileImage: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=22c55e&color=000`,
        isEmailVerified: true,
        isActive: true,
      });
      
      await MemberProfile.create({
        userId: member._id,
        height: member.height,
        weight: member.weight,
        fitnessLevel: i % 2 === 0 ? 'INTERMEDIATE' : 'BEGINNER',
        goals: i % 2 === 0 ? 'MUSCLE_GAIN' : 'WEIGHT_LOSS',
        membershipStartDate: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
      });

      // Entry QR Code
      const qrData = `GYM_MEMBER_${member._id}`;
      const qrCodeImage = await QRCode.toDataURL(qrData);
      
      await MemberQRCode.create({
        memberId: member._id,
        qrCodeData: qrData,
        isActive: true,
      });

      members.push(member);
    }

    // ============ 5. MEMBERSHIP PLANS ============
    console.log('💳 Creating database-configured membership plans...');
    const plans = await MembershipPlan.create([
      {
        name: 'Basic',
        description: 'Ideal entry plan for individual gym access & basic equipment.',
        price: 4000,
        currency: 'LKR',
        durationMonths: 1,
        features: ['Gym access', 'Locker access', 'Fitness assessment'],
        includeAIAssistant: true,
        isActive: true,
      },
      {
        name: 'Standard',
        description: 'Most popular monthly plan with workout tracking.',
        price: 6000,
        currency: 'LKR',
        durationMonths: 1,
        features: ['Everything in Basic', 'Personalized workout plan', 'Progress tracking', 'AI Fitness Assistant'],
        includeAIAssistant: true,
        isActive: true,
      },
      {
        name: 'Premium',
        description: 'Full experience including personal training support.',
        price: 10000,
        currency: 'LKR',
        durationMonths: 1,
        features: ['Everything in Standard', 'Personal training', 'Priority PT booking', 'Advanced progress tracking'],
        includeAIAssistant: true,
        isActive: true,
      },
      {
        name: 'Quarterly',
        description: '3-Month commitment package with savings.',
        price: 16000,
        currency: 'LKR',
        durationMonths: 3,
        features: ['All Premium features', 'Best value discount', 'Flexible cancellation'],
        includeAIAssistant: true,
        isActive: true,
      },
      {
        name: 'Annual',
        description: 'Full year fitness package with maximum savings.',
        price: 60000,
        currency: 'LKR',
        durationMonths: 12,
        features: ['All Premium features', 'Maximum yearly savings', 'Free gym merchandise'],
        includeAIAssistant: true,
        isActive: true,
      },
      {
        name: 'Family',
        description: 'Shared membership for up to 4 family members.',
        price: 15000,
        currency: 'LKR',
        durationMonths: 1,
        features: ['Up to 4 family members', 'Standard features for all', 'Family discount rate'],
        includeAIAssistant: true,
        isActive: true,
      },
    ]);

    await Package.create([
      { name: 'Basic Plan', price: 4000, duration: '1 Month', description: 'Gym access, locker & fitness assessment', level: 'beginner', benefits: ['Gym access', 'Locker access', 'Fitness assessment'] },
      { name: 'Standard Plan', price: 6000, duration: '1 Month', description: 'Everything in Basic + workout plan & progress tracking', level: 'intermediate', benefits: ['Gym access', 'Workout plan', 'Progress tracking', 'AI Assistant'] },
      { name: 'Premium Plan', price: 10000, duration: '1 Month', description: 'Everything in Standard + personal training & priority booking', level: 'advanced', benefits: ['Personal training', 'Priority PT booking', 'Advanced progress tracking'] },
      { name: 'Quarterly Plan', price: 16000, duration: '3 Months', description: '3-Month commitment package with savings', level: 'intermediate', benefits: ['3-Month savings', 'All Premium features', 'Flexible cancellation'] },
      { name: 'Annual Plan', price: 60000, duration: '12 Months', description: 'Full year fitness package with maximum savings', level: 'advanced', benefits: ['Full year access', 'Maximum savings', 'Free merchandise'] },
      { name: 'Family Plan', price: 15000, duration: '1 Month', description: 'Shared membership for up to 4 family members', level: 'beginner', benefits: ['Up to 4 members', 'Standard features', 'Family discount'] },
    ]);

    // Assign active memberships & payments
    for (let i = 0; i < members.length; i++) {
      const plan = plans[i % plans.length];
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + plan.durationMonths);

      await Membership.create({
        memberId: members[i]._id,
        planId: plan._id,
        startDate,
        endDate,
        status: 'ACTIVE',
        autoRenew: true,
      });

      await Payment.create({
        userId: members[i]._id,
        amount: plan.price,
        currency: 'LKR',
        status: 'completed',
        paymentMethod: 'card',
        description: `Membership Purchase - ${plan.name} Plan`,
      });
    }

    // ============ 6. EXERCISES & WORKOUT LOGS ============
    console.log('🏋️ Creating exercise library & sample workout logs...');
    const exercises = await Exercise.create([
      {
        name: 'Barbell Bench Press',
        description: 'Flat bench press for chest, triceps, and anterior deltoids.',
        muscleGroup: 'Chest',
        muscleGroups: ['Chest', 'Triceps', 'Shoulders'],
        difficulty: 'INTERMEDIATE',
        caloriesPer10Min: 85,
        beginnerReps: '8-10',
        intermediateReps: '6-8',
        advancedReps: '4-6',
      },
      {
        name: 'Barbell Squats',
        description: 'Back squats for leg strength and quadriceps development.',
        muscleGroup: 'Legs',
        muscleGroups: ['Quadriceps', 'Glutes', 'Hamstrings'],
        difficulty: 'INTERMEDIATE',
        caloriesPer10Min: 105,
        beginnerReps: '10-12',
        intermediateReps: '8-10',
        advancedReps: '5-8',
      },
      {
        name: 'Conventional Deadlift',
        description: 'Posterior chain builder for back, glutes, and grip strength.',
        muscleGroup: 'Back',
        muscleGroups: ['Back', 'Glutes', 'Hamstrings'],
        difficulty: 'ADVANCED',
        caloriesPer10Min: 120,
        beginnerReps: '5-6',
        intermediateReps: '5-5',
        advancedReps: '3-5',
      },
      {
        name: 'Pull-ups',
        description: 'Bodyweight vertical pull for lats and biceps.',
        muscleGroup: 'Back',
        muscleGroups: ['Back', 'Biceps'],
        difficulty: 'BEGINNER',
        caloriesPer10Min: 70,
        beginnerReps: '5-8',
        intermediateReps: '8-12',
        advancedReps: '12-15',
      },
    ]);

    // Sample workouts
    for (let i = 0; i < 5; i++) {
      await Workout.create({
        userId: members[i]._id,
        exerciseId: exercises[i % exercises.length]._id,
        duration: 45,
        sets: 4,
        reps: 10,
        weight: 60 + (i * 5),
        caloriesBurned: 220,
        date: new Date(Date.now() - (i * 2 * 24 * 60 * 60 * 1000)),
      });
    }

    // ============ 7. PERSONAL TRAINING PACKAGES & BOOKINGS ============
    console.log('🏆 Creating Personal Training packages & bookings...');
    const ptPackages = await PersonalTrainingPackage.create([
      { name: '4 Sessions Pack', sessions: 4, durationWeeks: 4, price: 16000, description: '4 1-on-1 personal training sessions' },
      { name: '8 Sessions Pack', sessions: 8, durationWeeks: 8, price: 30000, description: '8 1-on-1 personal training sessions' },
      { name: '12 Sessions Pack', sessions: 12, durationWeeks: 12, price: 42000, description: '12 1-on-1 personal training sessions' },
      { name: '20 Sessions Pack', sessions: 20, durationWeeks: 16, price: 65000, description: '20 1-on-1 personal training sessions' },
    ]);

    for (let i = 0; i < 4; i++) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + i + 1);

      await PersonalTrainingBooking.create({
        memberId: members[i]._id,
        trainerId: trainer1._id,
        packageId: ptPackages[i % ptPackages.length]._id,
        sessionDate: tomorrow,
        startTime: '10:00',
        endTime: '11:00',
        status: 'CONFIRMED',
      });
    }

    // ============ 8. SAMPLE ATTENDANCE RECORDS ============
    console.log('📍 Creating attendance check-in records...');
    for (let i = 0; i < members.length; i++) {
      const checkInTime = new Date();
      checkInTime.setDate(checkInTime.getDate() - (i % 7));
      checkInTime.setHours(9, 30, 0);

      await Attendance.create({
        memberId: members[i]._id,
        checkInTime,
        checkOutTime: new Date(checkInTime.getTime() + 90 * 60 * 1000),
        method: 'QR',
        status: 'CHECKED_OUT',
        duration: 90,
      });
    }

    // ============ 9. AI CONFIGURATION ============
    console.log('🤖 Creating production AI configuration...');
    await AIConfiguration.create({
      provider: 'PRODUCTION_AI',
      modelName: 'gemini-1.5-flash',
      modelVersion: '1.0',
      baseURL: process.env.AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
      isActive: true,
      parameters: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        numPredict: 256,
        repeatPenalty: 1.1,
      },
      systemPrompt: 'You are FitBot, a database-aware AI assistant for GymFit Pro.',
      maxTokens: 2048,
      timeoutMs: 30000,
      isHealthy: true,
    });

    console.log('✨ Seed completed successfully!');
    console.log('\n🔐 Test Accounts:');
    console.log('   System Admin: poornadanushka2@gmail.com / ilikeit@');
    console.log('   Admin:        admin@gym.local / Admin@123456');
    console.log('   Staff:        reception@gym.local / Staff@123456');
    console.log('   Trainer:      john.trainer@gym.local / Trainer@123456');
    console.log('   Member:       alice.johnson@email.com / Member@123456');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
