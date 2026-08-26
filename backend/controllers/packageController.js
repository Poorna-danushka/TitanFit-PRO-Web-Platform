import Package from '../models/Package.js';
import logger from '../utils/logger.js';

/**
 * Get all packages
 * GET /api/v1/packages
 */
export const getAllPackages = async (req, res) => {
  try {
    let packages = await Package.find({ isActive: true }).sort({ createdAt: -1 });

    if (packages.length === 0) {
      const MembershipPlan = (await import('../models/MembershipPlan.js')).default;
      const plans = await MembershipPlan.find({ isActive: true }).sort({ price: 1 });

      packages = plans.map((p) => ({
        _id: p._id,
        name: p.name,
        description: p.description || `${p.name} Gym Membership Plan`,
        price: p.price,
        currency: p.currency || 'LKR',
        duration: p.durationMonths ? `${p.durationMonths} Month${p.durationMonths > 1 ? 's' : ''}` : '1 Month',
        benefits: p.features || ['Gym Access', 'Locker Room'],
        features: p.features || ['Gym Access', 'Locker Room'],
        isFamilyPackage: p.name?.toLowerCase().includes('family') || false,
        maxFamilyMembers: 4,
        isActive: p.isActive,
      }));

      return res.status(200).json({
        success: true,
        count: packages.length,
        packages,
        data: packages,
      });
    }

    res.status(200).json({
      success: true,
      count: packages.length,
      packages,
      data: packages,
    });
  } catch (error) {
    logger.error(`Error fetching packages: ${error.message}`);
    res.status(500).json({ message: 'Error fetching packages', error: error.message });
  }
};

/**
 * Get package by ID
 * GET /api/v1/packages/:id
 */
export const getPackageById = async (req, res) => {
  try {
    const pkg = await Package.findById(req.params.id);

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    res.status(200).json({
      success: true,
      package: pkg,
    });
  } catch (error) {
    logger.error(`Error fetching package: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching package',
    });
  }
};

/**
 * Create new package
 * POST /api/v1/packages
 */
export const createPackage = async (req, res) => {
  try {
    const {
      name,
      price,
      duration,
      description,
      level,
      image,
      benefits,
      hasPersonalTrainer,
      maxPTSessions,
      isFamilyPackage,
      maxFamilyMembers,
    } = req.body;

    if (!name || !price || !duration || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields (name, price, duration, description)',
      });
    }

    const pkg = new Package({
      name,
      price,
      duration,
      description,
      level: level || 'intermediate',
      image: image || '',
      benefits: benefits || [],
      hasPersonalTrainer: Boolean(hasPersonalTrainer),
      maxPTSessions: maxPTSessions || 0,
      isFamilyPackage: Boolean(isFamilyPackage || name.toLowerCase().includes('family')),
      maxFamilyMembers: maxFamilyMembers || 4,
      isActive: true,
    });

    await pkg.save();

    res.status(201).json({
      success: true,
      message: 'Package created successfully',
      package: pkg,
    });
  } catch (error) {
    logger.error(`Error creating package: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error creating package',
      error: error.message,
    });
  }
};

/**
 * Update package details
 * PUT /api/v1/packages/:id
 */
export const updatePackage = async (req, res) => {
  try {
    const {
      name,
      price,
      duration,
      description,
      level,
      image,
      benefits,
      isActive,
      hasPersonalTrainer,
      maxPTSessions,
      isFamilyPackage,
      maxFamilyMembers,
    } = req.body;

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (price !== undefined) updateFields.price = price;
    if (duration !== undefined) updateFields.duration = duration;
    if (description !== undefined) updateFields.description = description;
    if (level !== undefined) updateFields.level = level;
    if (image !== undefined) updateFields.image = image;
    if (benefits !== undefined) updateFields.benefits = benefits;
    if (isActive !== undefined) updateFields.isActive = isActive;
    if (hasPersonalTrainer !== undefined) updateFields.hasPersonalTrainer = hasPersonalTrainer;
    if (maxPTSessions !== undefined) updateFields.maxPTSessions = maxPTSessions;
    if (isFamilyPackage !== undefined) updateFields.isFamilyPackage = isFamilyPackage;
    if (maxFamilyMembers !== undefined) updateFields.maxFamilyMembers = maxFamilyMembers;

    const pkg = await Package.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true,
    });

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Package updated successfully',
      package: pkg,
    });
  } catch (error) {
    logger.error(`Error updating package: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error updating package',
      error: error.message,
    });
  }
};

/**
 * Delete package
 * DELETE /api/v1/packages/:id
 */
export const deletePackage = async (req, res) => {
  try {
    const pkg = await Package.findByIdAndDelete(req.params.id);

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Package deleted successfully',
    });
  } catch (error) {
    logger.error(`Error deleting package: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error deleting package',
    });
  }
};

export default {
  getAllPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage,
};
