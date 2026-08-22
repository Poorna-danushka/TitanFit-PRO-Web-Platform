import Exercise from '../models/Exercise.js';

// Get all exercises
export const getAllExercises = async (req, res) => {
  try {
    const exercises = await Exercise.find();
    res.status(200).json({
      message: 'Exercises fetched successfully',
      count: exercises.length,
      exercises,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching exercises', error: error.message });
  }
};

// Get single exercise
export const getExerciseById = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id);
    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }

    res.status(200).json({
      message: 'Exercise fetched successfully',
      exercise,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching exercise', error: error.message });
  }
};

// Create exercise (admin only)
export const createExercise = async (req, res) => {
  try {
    const {
      name,
      muscleGroup,    // singular from older frontend forms
      muscleGroups,   // plural from newer frontend forms
      description,
      image,
      beginnerReps,
      intermediateReps,
      advancedReps,
      steps,
      difficulty,
      equipment,
      instructions,
      caloriesPer10Min,
    } = req.body;

    // Normalize: accept muscleGroup (string) or muscleGroups (array)
    const normalizedMuscleGroups =
      (Array.isArray(muscleGroups) && muscleGroups.length > 0)
        ? muscleGroups
        : muscleGroup
          ? [muscleGroup]
          : [];

    if (!name || normalizedMuscleGroups.length === 0) {
      return res.status(400).json({ message: 'Please provide name and at least one muscle group.', received: req.body });
    }

    const exercise = new Exercise({
      name,
      muscleGroups: normalizedMuscleGroups,
      description:       description       || '',
      image:             image             || '',
      beginnerReps:      beginnerReps      || '',
      intermediateReps:  intermediateReps  || '',
      advancedReps:      advancedReps      || '',
      steps:             Array.isArray(steps) ? steps : steps ? [steps] : [],
      difficulty:        difficulty        || 'INTERMEDIATE',
      equipment:         Array.isArray(equipment) ? equipment : equipment ? [equipment] : [],
      instructions:      Array.isArray(instructions) ? instructions : instructions ? [instructions] : [],
      caloriesPer10Min:  caloriesPer10Min  || 50,
    });

    await exercise.save();

    res.status(201).json({
      message: 'Exercise created successfully',
      exercise,
    });
  } catch (error) {
    console.error('Error creating exercise:', error);
    res.status(500).json({ message: 'Error creating exercise', error: error.message });
  }
};

// Update exercise (admin only)
export const updateExercise = async (req, res) => {
  try {
    const exercise = await Exercise.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }

    res.status(200).json({
      message: 'Exercise updated successfully',
      exercise,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating exercise', error: error.message });
  }
};

// Delete exercise (admin only)
export const deleteExercise = async (req, res) => {
  try {
    const exercise = await Exercise.findByIdAndDelete(req.params.id);

    if (!exercise) {
      return res.status(404).json({ message: 'Exercise not found' });
    }

    res.status(200).json({
      message: 'Exercise deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting exercise', error: error.message });
  }
};
