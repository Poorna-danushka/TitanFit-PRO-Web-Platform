import Package from '../models/Package.js';
import PackageExercise from '../models/PackageExercise.js';
import Exercise from '../models/Exercise.js';
import logger from '../utils/logger.js';

// Helper function to enrich package with exercise details
const enrichPackageWithExercises = async (pkg) => {
  try {
    const packageExercises = await PackageExercise.find({ packageId: pkg._id, isActive: true })
      .populate('exerciseId')
      .sort({ order: 1 });

    return {
      ...pkg.toObject(),
      exercises: packageExercises
        .filter(pe => pe.exerciseId) // Filter out null exercises
        .map(pe => ({
          _id: pe.exerciseId._id,
          name: pe.exerciseId.name,
          muscleGroup: pe.exerciseId.muscleGroup,
          image: pe.exerciseId.image,
          description: pe.exerciseId.description,
          steps: pe.exerciseId.steps,
          beginnerReps: pe.exerciseId.beginnerReps,
          intermediateReps: pe.exerciseId.intermediateReps,
          advancedReps: pe.exerciseId.advancedReps,
          packageConfig: {
            reps: pe.reps,
            sets: pe.sets,
            restTime: pe.restTime,
            duration: pe.duration,
            difficulty: pe.difficulty,
            notes: pe.notes,
            order: pe.order,
          },
        })),
    };
  } catch (error) {
    logger.error(`Error enriching package with exercises: ${error.message}`);
    // Return package without exercises if enrichment fails
    return {
      ...pkg.toObject(),
      exercises: [],
    };
  }
};

/**
 * Get all packages with exercise details
 * GET /api/v1/packages
 */
export const getAllPackages = async (req, res) => {
  try {
    let packages = await Package.find({ isActive: true }).sort({ createdAt: -1 });

    if (packages.length === 0) {
      const MembershipPlan = (await import('../models/MembershipPlan.js')).default;
      const plans = await MembershipPlan.find({ isActive: true }).sort({ price: 1 });

      packages = plans.map(p => ({
        _id: p._id,
        name: p.name,
        description: p.description || `${p.name} Gym Membership Plan`,
        price: p.price,
        currency: p.currency || 'LKR',
        duration: p.durationMonths ? `${p.durationMonths} Month${p.durationMonths > 1 ? 's' : ''}` : '1 Month',
        benefits: p.features || ['Gym Access', 'Locker Room', 'AI Coach Access'],
        features: p.features || ['Gym Access', 'Locker Room', 'AI Coach Access'],
        exercises: [],
        isActive: p.isActive,
      }));

      return res.status(200).json({
        success: true,
        count: packages.length,
        packages,
        data: packages,
      });
    }

    const enrichedPackages = await Promise.all(packages.map(enrichPackageWithExercises));

    res.status(200).json({
      success: true,
      count: enrichedPackages.length,
      packages: enrichedPackages,
      data: enrichedPackages,
    });
  } catch (error) {
    logger.error(`Error fetching packages: ${error.message}`);
    res.status(500).json({ message: 'Error fetching packages', error: error.message });
  }
};

/**
 * Get package by ID with full exercise details
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

    const enrichedPackage = await enrichPackageWithExercises(pkg);

    res.status(200).json({
      success: true,
      package: enrichedPackage,
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
 * Create new package with exercises
 * POST /api/v1/packages
 */
export const createPackage = async (req, res) => {
  try {
    const { name, price, duration, description, level, image, benefits, exercises } = req.body;

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
      isActive: true,
    });

    await pkg.save();

    // Add exercises if provided
    if (exercises && Array.isArray(exercises) && exercises.length > 0) {
      const packageExercises = await Promise.all(
        exercises.map(async (ex, index) => {
          const exercise = await Exercise.findById(ex.exerciseId || ex);
          if (!exercise) throw new Error(`Exercise not found: ${ex.exerciseId || ex}`);

          const reps = ex.reps || exercise[`${level || 'intermediate'}Reps`] || 'As prescribed';

          const pe = new PackageExercise({
            packageId: pkg._id,
            exerciseId: exercise._id,
            reps,
            sets: ex.sets || 3,
            restTime: ex.restTime || 60,
            duration: ex.duration || 15,
            difficulty: ex.difficulty || level || 'intermediate',
            notes: ex.notes || '',
            order: index,
            isActive: true,
          });

          return pe.save();
        })
      );

      // Update package totals
      const totalDuration = packageExercises.reduce((sum, pe) => sum + pe.duration, 0);
      pkg.totalDuration = totalDuration;
      pkg.totalExercises = packageExercises.length;
      await pkg.save();

      logger.info(`Package created with ${packageExercises.length} exercises: ${pkg._id}`);
    }

    const enrichedPackage = await enrichPackageWithExercises(pkg);

    res.status(201).json({
      success: true,
      message: 'Package created successfully',
      package: enrichedPackage,
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
 * Update package details and sync exercises
 * PUT /api/v1/packages/:id
 *
 * FIX: Build the update object from only defined fields to avoid
 * triggering Mongoose required-field validators on undefined values.
 * Also syncs the exercises array when provided.
 */
export const updatePackage = async (req, res) => {
  try {
    const { name, price, duration, description, level, image, benefits, isActive, exercises } = req.body;

    // Build update object with only provided (defined) fields to avoid
    // firing runValidators on fields the caller didn't intend to change.
    const updateFields = {};
    if (name       !== undefined) updateFields.name        = name;
    if (price      !== undefined) updateFields.price       = price;
    if (duration   !== undefined) updateFields.duration    = duration;
    if (description!== undefined) updateFields.description = description;
    if (level      !== undefined) updateFields.level       = level;
    if (image      !== undefined) updateFields.image       = image;
    if (benefits   !== undefined) updateFields.benefits    = benefits;
    if (isActive   !== undefined) updateFields.isActive    = isActive;

    const pkg = await Package.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    );

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    // Sync exercises if the caller provided an updated list
    if (exercises && Array.isArray(exercises)) {
      // Remove all existing exercise links for this package
      await PackageExercise.deleteMany({ packageId: pkg._id });

      if (exercises.length > 0) {
        const savedExercises = await Promise.all(
          exercises.map(async (ex, index) => {
            const exercise = await Exercise.findById(ex.exerciseId || ex._id || ex);
            if (!exercise) throw new Error(`Exercise not found: ${ex.exerciseId || ex}`);

            const resolvedLevel = level || pkg.level || 'intermediate';
            const reps = ex.reps || exercise[`${resolvedLevel}Reps`] || 'As prescribed';

            const pe = new PackageExercise({
              packageId: pkg._id,
              exerciseId: exercise._id,
              reps,
              sets: ex.sets || 3,
              restTime: ex.restTime || 60,
              duration: ex.duration || 15,
              difficulty: ex.difficulty || resolvedLevel,
              notes: ex.notes || '',
              order: index,
              isActive: true,
            });

            return pe.save();
          })
        );

        // Update denormalised totals
        const totalDuration = savedExercises.reduce((sum, pe) => sum + pe.duration, 0);
        pkg.totalDuration   = totalDuration;
        pkg.totalExercises  = savedExercises.length;
        await pkg.save();
      } else {
        pkg.totalDuration  = 0;
        pkg.totalExercises = 0;
        await pkg.save();
      }
    }

    const enrichedPackage = await enrichPackageWithExercises(pkg);

    res.status(200).json({
      success: true,
      message: 'Package updated successfully',
      package: enrichedPackage,
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

    // Delete associated package exercises
    await PackageExercise.deleteMany({ packageId: pkg._id });

    logger.info(`Package deleted: ${pkg._id}`);

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

/**
 * Add exercise to package
 * POST /api/v1/packages/:id/exercises
 */
export const addExerciseToPackage = async (req, res) => {
  try {
    const { exerciseId, reps, sets, restTime, duration, difficulty, notes } = req.body;
    const { id: packageId } = req.params;

    if (!exerciseId) {
      return res.status(400).json({
        success: false,
        message: 'Exercise ID is required',
      });
    }

    const pkg = await Package.findById(packageId);
    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    const exercise = await Exercise.findById(exerciseId);
    if (!exercise) {
      return res.status(404).json({
        success: false,
        message: 'Exercise not found',
      });
    }

    // Get next order number
    const maxOrder = await PackageExercise.findOne({ packageId })
      .sort({ order: -1 })
      .select('order');
    const nextOrder = (maxOrder?.order || -1) + 1;

    const packageExercise = new PackageExercise({
      packageId,
      exerciseId,
      reps: reps || exercise[`${pkg.level}Reps`] || 'As prescribed',
      sets: sets || 3,
      restTime: restTime || 60,
      duration: duration || 15,
      difficulty: difficulty || pkg.level || 'intermediate',
      notes: notes || '',
      order: nextOrder,
      isActive: true,
    });

    await packageExercise.save();

    // Update package totals
    const allExercises = await PackageExercise.find({ packageId, isActive: true });
    const totalDuration = allExercises.reduce((sum, pe) => sum + pe.duration, 0);
    pkg.totalDuration = totalDuration;
    pkg.totalExercises = allExercises.length;
    await pkg.save();

    res.status(201).json({
      success: true,
      message: 'Exercise added to package',
      packageExercise,
    });
  } catch (error) {
    logger.error(`Error adding exercise to package: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error adding exercise to package',
      error: error.message,
    });
  }
};

/**
 * Update exercise in package (change reps, sets, difficulty, etc.)
 * PUT /api/v1/packages/:id/exercises/:exerciseId
 */
export const updatePackageExercise = async (req, res) => {
  try {
    const { id: packageId, exerciseId } = req.params;
    const { reps, sets, restTime, duration, difficulty, notes } = req.body;

    const packageExercise = await PackageExercise.findOne({
      packageId,
      exerciseId,
    });

    if (!packageExercise) {
      return res.status(404).json({
        success: false,
        message: 'Exercise not found in package',
      });
    }

    if (reps !== undefined) packageExercise.reps = reps;
    if (sets !== undefined) packageExercise.sets = sets;
    if (restTime !== undefined) packageExercise.restTime = restTime;
    if (duration !== undefined) packageExercise.duration = duration;
    if (difficulty !== undefined) packageExercise.difficulty = difficulty;
    if (notes !== undefined) packageExercise.notes = notes;

    await packageExercise.save();

    // Update package totals
    const allExercises = await PackageExercise.find({ packageId, isActive: true });
    const pkg = await Package.findById(packageId);
    if (pkg) {
      const totalDuration = allExercises.reduce((sum, pe) => sum + pe.duration, 0);
      pkg.totalDuration = totalDuration;
      await pkg.save();
    }

    res.status(200).json({
      success: true,
      message: 'Exercise configuration updated',
      packageExercise,
    });
  } catch (error) {
    logger.error(`Error updating package exercise: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error updating package exercise',
    });
  }
};

/**
 * Remove exercise from package
 * DELETE /api/v1/packages/:id/exercises/:exerciseId
 */
export const removeExerciseFromPackage = async (req, res) => {
  try {
    const { id: packageId, exerciseId } = req.params;

    const packageExercise = await PackageExercise.findOneAndDelete({
      packageId,
      exerciseId,
    });

    if (!packageExercise) {
      return res.status(404).json({
        success: false,
        message: 'Exercise not found in package',
      });
    }

    // Reorder remaining exercises
    const remainingExercises = await PackageExercise.find({ packageId, isActive: true })
      .sort({ order: 1 });

    for (let i = 0; i < remainingExercises.length; i++) {
      remainingExercises[i].order = i;
      await remainingExercises[i].save();
    }

    // Update package totals
    const pkg = await Package.findById(packageId);
    if (pkg) {
      const allExercises = await PackageExercise.find({ packageId, isActive: true });
      const totalDuration = allExercises.reduce((sum, pe) => sum + pe.duration, 0);
      pkg.totalDuration = totalDuration;
      pkg.totalExercises = allExercises.length;
      await pkg.save();
    }

    res.status(200).json({
      success: true,
      message: 'Exercise removed from package',
    });
  } catch (error) {
    logger.error(`Error removing exercise from package: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error removing exercise from package',
    });
  }
};

/**
 * Reorder exercises in package
 * PUT /api/v1/packages/:id/exercises/reorder
 */
export const reorderPackageExercises = async (req, res) => {
  try {
    const { id: packageId } = req.params;
    const { exercises } = req.body; // Array of { exerciseId, newOrder }

    if (!Array.isArray(exercises)) {
      return res.status(400).json({
        success: false,
        message: 'Exercises array is required',
      });
    }

    for (const item of exercises) {
      await PackageExercise.findOneAndUpdate(
        { packageId, exerciseId: item.exerciseId },
        { order: item.newOrder }
      );
    }

    const reorderedExercises = await PackageExercise.find({ packageId, isActive: true })
      .sort({ order: 1 });

    res.status(200).json({
      success: true,
      message: 'Exercises reordered successfully',
      exercises: reorderedExercises,
    });
  } catch (error) {
    logger.error(`Error reordering exercises: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error reordering exercises',
      error: error.message,
    });
  }
};

/**
 * Get exercises for a package
 * GET /api/v1/packages/:id/exercises
 */
export const getPackageExercises = async (req, res) => {
  try {
    const { id: packageId } = req.params;

    const pkg = await Package.findById(packageId);
    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found',
      });
    }

    const exercises = await PackageExercise.find({ packageId, isActive: true })
      .populate('exerciseId')
      .sort({ order: 1 });

    const enrichedExercises = exercises
      .filter(pe => pe.exerciseId)  // guard: skip if referenced exercise was deleted
      .map(pe => ({
        ...pe.exerciseId.toObject(),
        packageConfig: {
          reps:       pe.reps,
          sets:       pe.sets,
          restTime:   pe.restTime,
          duration:   pe.duration,
          difficulty: pe.difficulty,
          notes:      pe.notes,
          order:      pe.order,
        },
      }));

    res.status(200).json({
      success: true,
      count: enrichedExercises.length,
      exercises: enrichedExercises,
    });
  } catch (error) {
    logger.error(`Error fetching package exercises: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Error fetching package exercises',
      error: error.message,
    });
  }
};

export default {
  getAllPackages,
  getPackageById,
  createPackage,
  updatePackage,
  deletePackage,
  addExerciseToPackage,
  updatePackageExercise,
  removeExerciseFromPackage,
  reorderPackageExercises,
  getPackageExercises,
};
