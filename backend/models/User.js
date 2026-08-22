import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true, default: 'Member' },
    lastName: { type: String, trim: true, default: '' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String },
    password: { type: String, required: true, minlength: 8, select: false },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['M', 'F', 'OTHER'] },
    role: { 
      type: String, 
      enum: ['SYSTEM_ADMIN', 'ADMIN', 'TRAINER', 'STAFF', 'MEMBER'], 
      default: 'MEMBER' 
    },
    isSystemAdmin: { type: Boolean, default: false },
    
    // Profile
    profileImage:         { type: String },   // Cloudinary secure_url
    profileImagePublicId: { type: String },   // Cloudinary public_id for clean deletion
    galleryImages: [
      {
        url:        { type: String, required: true },
        publicId:   { type: String },
        caption:    { type: String },
        uploadedAt: { type: Date, default: Date.now }
      }
    ],
    bio: { type: String },
    
    // Email verification
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpiry: { type: Date, select: false },
    
    // Mobile verification
    isMobileVerified: { type: Boolean, default: false },
    mobileVerificationToken: { type: String, select: false },
    mobileVerificationExpiry: { type: Date, select: false },
    
    // Account security
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    lastLogin: { type: Date },
    
    // 2FA
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },
    
    // Password reset
    passwordResetToken: { type: String, select: false },
    passwordResetExpiry: { type: Date, select: false },
    
    // Status
    isActive: { type: Boolean, default: true },

    // First-login password change enforcement
    // Set to true when an admin creates the account with a temp password
    mustChangePassword:  { type: Boolean, default: false },
    tempPasswordSetAt:   { type: Date },
    
    // Notifications read tracking
    readNotifications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Notification', default: [] }],
    
    // Preferences
    emailNotifications: { type: Boolean, default: true },
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    
    // Activity tracking
    lastActivityAt: { type: Date, default: Date.now },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

// Virtual getter and setter for full name
userSchema.virtual('name')
  .get(function () {
    const first = (this.firstName || '').trim();
    const last = (this.lastName || '').trim();
    // Avoid "Danushka Danushka" when lastName was set equal to firstName
    if (!last || last === first) return first || this.email?.split('@')[0] || 'Member';
    return `${first} ${last}`.trim() || this.email?.split('@')[0] || 'Member';
  })
  .set(function (v) {
    if (v) {
      const parts = v.trim().split(/\s+/);
      this.firstName = parts[0] || '';
      // Only set lastName if there are actually 2+ words
      this.lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
    }
  });

// Virtual: avatarUrl — alias for profileImage (Cloudinary secure_url)
userSchema.virtual('avatarUrl')
  .get(function () { return this.profileImage || null; })
  .set(function (v) { this.profileImage = v; });

// Virtual: avatarPublicId — alias for profileImagePublicId (Cloudinary public_id)
userSchema.virtual('avatarPublicId')
  .get(function () { return this.profileImagePublicId || null; })
  .set(function (v) { this.profileImagePublicId = v; });

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

// Pre-validate middleware to parse name into firstName/lastName & system admin check
userSchema.pre('validate', function () {
  if (!this.firstName && this.email) {
    this.firstName = this.email.split('@')[0];
  }
  if (this.lastName === undefined || this.lastName === null || this.lastName === this.firstName) {
    this.lastName = ''; // leave blank for single-word names
  }
  if (this.role === 'SYSTEM_ADMIN') {
    this.isSystemAdmin = true;
  }
});

// Indexes for performance (email index is already created by unique:true in schema)
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

// Hash password before saving using BCRYPT_SALT_ROUNDS from env
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  // Prevent double-hashing if password is already a valid bcrypt hash
  if (this.password && (this.password.startsWith('$2a$') || this.password.startsWith('$2b$'))) {
    return;
  }

  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);
  const salt = await bcryptjs.genSalt(saltRounds);
  this.password = await bcryptjs.hash(this.password, salt);
});

// Compare password method
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password || !enteredPassword) return false;
  return bcryptjs.compare(enteredPassword, this.password);
};

// Check if account is locked
userSchema.methods.isAccountLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Increment login attempts
userSchema.methods.incLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5) {
    updates.$set = { lockUntil: new Date(Date.now() + 30 * 60 * 1000) };
  }

  return this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = async function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

export default mongoose.model('User', userSchema);