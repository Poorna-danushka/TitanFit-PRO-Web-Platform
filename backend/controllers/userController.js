import User from '../models/User.js';
import { sendStaffWelcomeEmail } from '../utils/email.js';
import crypto from 'crypto';

/**
 * Generate a secure temporary password.
 * Format: 3 uppercase + 3 lowercase + 3 digits + 2 symbols = 11 chars
 */
const generateTempPassword = () => {
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower   = 'abcdefghjkmnpqrstuvwxyz';
  const digits  = '23456789';
  const symbols = '@#!$';

  const pick = (charset, n) =>
    Array.from({ length: n }, () => charset[crypto.randomInt(charset.length)]).join('');

  const raw = pick(upper, 3) + pick(lower, 3) + pick(digits, 3) + pick(symbols, 2);
  // Fisher-Yates shuffle
  const arr = raw.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
};

/**
 * Get all users for Admin management
 */
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json({ count: users.length, users, data: users });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
};

/**
 * Create a user by Admin / System Admin
 * POST /api/v1/users
 *
 * For TRAINER / STAFF / ADMIN roles:
 *  - Auto-generates a secure temporary password
 *  - Sets mustChangePassword = true
 *  - Sends a welcome email with credentials
 *
 * For MEMBER role:
 *  - Admin can optionally supply a password, else a temp one is generated
 *  - No forced password change (member self-registers normally)
 */
export const createUserByAdmin = async (req, res) => {
  try {
    const { name, firstName, lastName, email, phone, role } = req.body;
    const requester     = req.user;
    const requesterRole = (req.userRole || requester?.role || 'MEMBER').toUpperCase();
    const isSystemAdmin = requester?.isSystemAdmin || requesterRole === 'SYSTEM_ADMIN';

    const targetRole = (role || 'MEMBER').toUpperCase();

    // Hierarchy enforcement
    if (['ADMIN', 'SYSTEM_ADMIN'].includes(targetRole) && !isSystemAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Only the System Admin can create Admin accounts.',
      });
    }

    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'A user with this email already exists.' });
    }

    const nameTrimmed      = (name || '').trim();
    const nameParts        = nameTrimmed ? nameTrimmed.split(/\s+/) : [];
    const parsedFirstName  = firstName || nameParts[0] || 'GymFit';
    const parsedLastName   = lastName  || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
    const fullName         = `${parsedFirstName} ${parsedLastName}`.trim();

    // Always auto-generate for staff/trainer/admin — never take from req.body
    const isStaffRole    = ['TRAINER', 'STAFF', 'ADMIN', 'SYSTEM_ADMIN'].includes(targetRole);
    const tempPassword   = generateTempPassword();
    const mustChangePwd  = isStaffRole; // Members don't need forced change

    const user = new User({
      firstName:          parsedFirstName,
      lastName:           parsedLastName,
      email:              normalizedEmail,
      phone:              phone ? phone.trim() : undefined,
      password:           tempPassword,          // will be hashed by pre-save hook
      role:               targetRole,
      isSystemAdmin:      targetRole === 'SYSTEM_ADMIN',
      isEmailVerified:    true,                  // admin-created accounts skip email verify
      isActive:           true,
      mustChangePassword: mustChangePwd,
      tempPasswordSetAt:  mustChangePwd ? new Date() : undefined,
    });

    await user.save();

    // Send welcome email with credentials
    const createdByName = requester?.name ||
      `${requester?.firstName || ''} ${requester?.lastName || ''}`.trim() ||
      'Admin';

    let emailSent = false;
    let emailError = null;

    if (isStaffRole) {
      try {
        await sendStaffWelcomeEmail(
          normalizedEmail,
          fullName,
          tempPassword,
          targetRole,
          createdByName,
        );
        emailSent = true;
      } catch (err) {
        emailError = err.message;
        // Don't fail the request — account is created, email is advisory
      }
    }

    return res.status(201).json({
      success:    true,
      message:    `${targetRole} account created successfully.${emailSent ? ' Welcome email sent with login credentials.' : ''}`,
      emailSent,
      emailError: emailError || undefined,
      // Only include tempPassword in response if email failed, so admin can relay manually
      tempPassword: (!emailSent && isStaffRole) ? tempPassword : undefined,
      user: {
        id:                 user._id,
        name:               user.name,
        email:              user.email,
        role:               user.role,
        isSystemAdmin:      user.isSystemAdmin,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
};


/**
 * Update User Role
 * PUT /api/v1/users/:id/role
 */
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const targetRole = (role || 'MEMBER').toUpperCase();
    const allowedRoles = ['SYSTEM_ADMIN', 'ADMIN', 'TRAINER', 'STAFF', 'MEMBER'];

    if (!allowedRoles.includes(targetRole)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    if (req.params.id === req.userId) {
      return res.status(400).json({ message: 'Cannot change your own role' });
    }

    const requester = req.user;
    const requesterRole = (req.userRole || requester?.role || 'MEMBER').toUpperCase();
    const isSystemAdmin = requester?.isSystemAdmin || requesterRole === 'SYSTEM_ADMIN';

    if (['ADMIN', 'SYSTEM_ADMIN'].includes(targetRole) && !isSystemAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Only the System Admin can promote users to Admin role.',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: targetRole, isSystemAdmin: targetRole === 'SYSTEM_ADMIN' },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ message: `User role updated to ${targetRole}`, user });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user role', error: error.message });
  }
};

/**
 * Toggle User Activation / Deactivation Status
 * PUT /api/v1/users/:id/status
 */
export const toggleUserStatus = async (req, res) => {
  try {
    const userIdToToggle = req.params.id;

    if (userIdToToggle === req.userId) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate your own account.' });
    }

    const userToToggle = await User.findById(userIdToToggle);
    if (!userToToggle) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (userToToggle.isSystemAdmin || userToToggle.role === 'SYSTEM_ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden. System Admin account status cannot be deactivated.' });
    }

    const requester = req.user;
    const requesterRole = (req.userRole || requester?.role || 'MEMBER').toUpperCase();
    const isSystemAdmin = requester?.isSystemAdmin || requesterRole === 'SYSTEM_ADMIN';
    const targetRole = (userToToggle.role || 'MEMBER').toUpperCase();

    // Standard Admins cannot deactivate other Admins
    if (targetRole === 'ADMIN' && !isSystemAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Only the System Admin can activate or deactivate Admin accounts.',
      });
    }

    const nextStatus = typeof req.body.isActive === 'boolean' ? req.body.isActive : !userToToggle.isActive;
    userToToggle.isActive = nextStatus;
    await userToToggle.save();

    res.status(200).json({
      success: true,
      message: `Account for ${userToToggle.email} has been ${nextStatus ? 'ACTIVATED' : 'DEACTIVATED'}.`,
      user: {
        id: userToToggle._id,
        name: userToToggle.name,
        email: userToToggle.email,
        role: userToToggle.role,
        isActive: userToToggle.isActive,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error toggling user status', error: error.message });
  }
};

/**
 * Delete User
 * DELETE /api/v1/users/:id
 */
export const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.userId) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.isSystemAdmin || user.role === 'SYSTEM_ADMIN') {
      return res.status(403).json({ message: 'Forbidden. System Admin account cannot be deleted.' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user' });
  }
};
