/**
 * remove_exercise_features.js
 *
 * Safe migration helper to remove exercise / workout related collections from MongoDB.
 * USAGE (dry-run):
 *   node remove_exercise_features.js
 *
 * To actually drop collections, set CONFIRM_REMOVE_EXERCISE=1 in the environment:
 *   CONFIRM_REMOVE_EXERCISE=1 node remove_exercise_features.js
 *
 * WARNING: Dropping collections is irreversible. Keep backups before running with CONFIRM flag.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/gymfit-pro';
const CONFIRM = process.env.CONFIRM_REMOVE_EXERCISE === '1' || process.env.FORCE === '1';

// Collections (common names used by the previous codebase)
const TARGET_COLLECTIONS = [
  'exercises',
  'workouts',
  'completedexercises',
  'completedeercises',
  'exerciselogs',
  'workoutexercises',
  'packageexercises',
  'workoutplans',
];

async function run() {
  console.log('Connecting to MongoDB:', MONGO_URI);
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });

  const db = mongoose.connection.db;
  const existing = await db.listCollections().toArray();
  const existingNames = existing.map(c => c.name.toLowerCase());

  const found = TARGET_COLLECTIONS.filter(name => existingNames.includes(name));

  if (found.length === 0) {
    console.log('No matching exercise/workout collections found. Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  console.log('Found the following exercise/workout-related collections:');
  found.forEach(c => console.log(' -', c));

  if (!CONFIRM) {
    console.log('\nDry-run mode (CONFIRM_REMOVE_EXERCISE not set).');
    console.log('To actually drop these collections, set CONFIRM_REMOVE_EXERCISE=1 and re-run this script.');
    await mongoose.disconnect();
    return;
  }

  console.log('\nCONFIRM flag detected — dropping collections.');
  for (const name of found) {
    try {
      await db.dropCollection(name);
      console.log(`Dropped collection: ${name}`);
    } catch (err) {
      console.error(`Failed to drop ${name}:`, err.message);
    }
  }

  console.log('\nDone. Consider compacting or backing up the database after destructive changes.');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
