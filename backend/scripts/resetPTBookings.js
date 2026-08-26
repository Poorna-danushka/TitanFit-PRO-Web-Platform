/**
 * resetPTBookings.js
 *
 * Safe helper script to clear all Personal Training bookings, active Trainer Assignments,
 * reset membership PT session counters, and reset trainer total client counts.
 * 
 * USAGE:
 *   node resetPTBookings.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PersonalTrainingBooking from '../models/PersonalTrainingBooking.js';
import TrainerAssignment from '../models/TrainerAssignment.js';
import Membership from '../models/Membership.js';
import TrainerProfile from '../models/TrainerProfile.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/gymfit-pro';

async function run() {
  console.log('Connecting to MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });

  console.log('\n--- Clearing PT Bookings and Assignments ---');
  
  // 1. Delete all personal training bookings
  const deletedBookings = await PersonalTrainingBooking.deleteMany({});
  console.log(`- Deleted ${deletedBookings.deletedCount} PersonalTrainingBooking documents.`);

  // 2. Delete all trainer assignments
  const deletedAssignments = await TrainerAssignment.deleteMany({});
  console.log(`- Deleted ${deletedAssignments.deletedCount} TrainerAssignment documents.`);

  // 3. Reset membership PT session counters and trainer associations
  const updatedMemberships = await Membership.updateMany(
    {},
    { 
      $set: { 
        ptSessionsUsedThisMonth: 0,
        trainerId: null 
      } 
    }
  );
  console.log(`- Reset ptSessionsUsedThisMonth and trainerId on ${updatedMemberships.modifiedCount} Membership documents.`);

  // 4. Reset trainer totalClients counts
  const updatedTrainers = await TrainerProfile.updateMany(
    {},
    { 
      $set: { 
        totalClients: 0 
      } 
    }
  );
  console.log(`- Reset totalClients to 0 on ${updatedTrainers.modifiedCount} TrainerProfile documents.`);

  console.log('\nPT Booking & Assignment Reset Complete! All members and trainers are now fully cleared.');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Reset script failed:', err);
  process.exit(1);
});
