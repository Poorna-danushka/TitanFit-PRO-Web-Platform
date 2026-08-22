import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const updateSystemAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const email = 'poornadanushka2@gmail.com';
    let user = await User.findOne({ email });

    if (user) {
      console.log(`Found existing account for ${email}. Updating to SYSTEM_ADMIN...`);
      user.role = 'SYSTEM_ADMIN';
      user.isSystemAdmin = true;
      user.isActive = true;
      user.isEmailVerified = true;
      user.password = 'ilikeit@';
      await user.save();
      console.log(`✅ ${email} has been updated to SYSTEM_ADMIN with password 'ilikeit@'!`);
    } else {
      console.log(`No existing user found for ${email}. Creating new SYSTEM_ADMIN account...`);
      user = await User.create({
        firstName: 'Poorna',
        lastName: 'Danushka',
        name: 'Poorna Danushka',
        email,
        password: 'ilikeit@',
        phone: '+94771234567',
        role: 'SYSTEM_ADMIN',
        isSystemAdmin: true,
        isEmailVerified: true,
        isActive: true,
      });
      console.log(`✅ Created new SYSTEM_ADMIN account for ${email}!`);
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating System Admin:', error);
    process.exit(1);
  }
};

updateSystemAdmin();
