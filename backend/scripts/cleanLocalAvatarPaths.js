import 'dotenv/config';
import mongoose from 'mongoose';

/**
 * One-time cleanup script.
 * Clears legacy /uploads/... local filesystem paths from User.profileImage
 * so the frontend falls back to initials/default avatar instead of broken images.
 *
 * Run from backend/ directory:
 *   node scripts/cleanLocalAvatarPaths.js
 */

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not set in .env');
  process.exit(1);
}

const run = async () => {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const col = mongoose.connection.db.collection('users');

  const stale = await col.find({ profileImage: { '$regex': '^/uploads/' } }).toArray();
  console.log(`Found ${stale.length} user(s) with local avatar paths.`);

  if (stale.length === 0) {
    console.log('Nothing to clean. All done!');
    await mongoose.disconnect();
    return;
  }

  for (const u of stale) {
    console.log(`  Clearing: ${u.email} => ${u.profileImage}`);
  }

  const result = await col.updateMany(
    { profileImage: { '$regex': '^/uploads/' } },
    { '$unset': { profileImage: '', profileImagePublicId: '' } }
  );

  console.log(`Cleared ${result.modifiedCount} local avatar path(s).`);
  console.log('Users now have no avatar. Frontend will show initials/default.');
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Script failed:', err.message);
  mongoose.disconnect();
  process.exit(1);
});