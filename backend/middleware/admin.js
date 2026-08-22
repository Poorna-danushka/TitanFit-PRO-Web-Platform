import User from '../models/User.js';

export const adminMiddleware = async (req, res, next) => {
  try {
    const user = req.user || (await User.findById(req.userId));
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const uRole = (user.role || '').toUpperCase();
    const isSysAdmin = user.isSystemAdmin || uRole === 'SYSTEM_ADMIN';
    const isAdmin = uRole === 'ADMIN' || isSysAdmin;

    if (!isAdmin) {
      return res.status(403).json({ message: 'Access denied: Admin only' });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error checking admin status' });
  }
};

export default adminMiddleware;
