import Joi from 'joi';
import PasswordValidator from 'password-validator';

// Create a password schema
const passwordSchema = new PasswordValidator();
passwordSchema
  .min(8)
  .has().uppercase()
  .has().lowercase()
  .has().digits()
  .has().symbols();

// Auth Validators
export const registerValidator = Joi.object({
  name: Joi.string().min(2).max(50).required().trim(),
  email: Joi.string().email({ tlds: { allow: false } }).required().lowercase().trim(),
  phone: Joi.string().allow('', null).optional(),
  password: Joi.string()
    .required()
    .custom((value, helpers) => {
      if (!passwordSchema.validate(value)) {
        return helpers.error(
          'any.custom',
          'Password must contain: uppercase, lowercase, numbers, and symbols (min 8 chars)'
        );
      }
      return value;
    }),
}).unknown(true);

export const loginValidator = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required().lowercase().trim(),
  password: Joi.string().required(),
}).unknown(true);

export const emailVerificationValidator = Joi.object({
  token: Joi.string().required(),
}).unknown(false);

export const forgotPasswordValidator = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required().lowercase().trim(),
}).unknown(true);

// User Validators
export const updateProfileValidator = Joi.object({
  name:         Joi.string().min(2).max(50).trim(),
  firstName:    Joi.string().min(1).max(50).trim(),
  lastName:     Joi.string().max(50).trim().allow(''),
  phone:        Joi.string().max(20).allow('', null).optional(),
  bio:          Joi.string().max(500).trim().allow('', null).optional(),
  gender:       Joi.string().valid('M', 'F', 'OTHER').allow('', null).optional(),
  dateOfBirth:  Joi.date().allow(null).optional(),
  weight:       Joi.number().positive().min(20).max(300).optional(),
  height:       Joi.number().positive().min(50).max(300).optional(),
  profileImage: Joi.string().uri().allow('', null).optional(),
  avatarUrl:    Joi.string().uri().allow('', null).optional(),
}).unknown(true);

export const changePasswordValidator = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string()
    .required()
    .custom((value, helpers) => {
      if (!passwordSchema.validate(value)) {
        return helpers.error('any.custom', 'Password does not meet requirements');
      }
      return value;
    }),
  confirmPassword: Joi.string().required().valid(Joi.ref('newPassword')).messages({
    'any.only': 'Passwords must match',
  }),
}).unknown(false);

// Package Validators
export const packageValidator = Joi.object({
  name: Joi.string().required().trim(),
  price: Joi.number().positive().required(),
  duration: Joi.string().required().trim(),
  description: Joi.string().max(500).required().trim(),
}).unknown(false);


// Member Profile Validators
export const membershipPurchaseValidator = Joi.object({
  planId: Joi.string().required(),
  paymentMethodId: Joi.string(),
}).unknown(false);

export const classBookingValidator = Joi.object({
  scheduleId: Joi.string().required(),
}).unknown(false);

export const nutritionPlanValidator = Joi.object({
  userId: Joi.string().required(),
  name: Joi.string().required().trim(),
  description: Joi.string().max(500).trim(),
  calories: Joi.number().positive(),
  protein: Joi.number().positive(),
  carbs: Joi.number().positive(),
  fats: Joi.number().positive(),
  mealPlan: Joi.array().items(Joi.string()),
}).unknown(false);

export const nutritionLogValidator = Joi.object({
  planId: Joi.string().required(),
  mealName: Joi.string().required().trim(),
  calories: Joi.number().positive().required(),
  protein: Joi.number().positive(),
  carbs: Joi.number().positive(),
  fats: Joi.number().positive(),
  mealTime: Joi.string(),
  notes: Joi.string().max(500),
}).unknown(false);

export const aiMessageValidator = Joi.object({
  message: Joi.string().required().max(2000).trim(),
  conversationId: Joi.string(),
}).unknown(false);

export const personaTrainingBookingValidator = Joi.object({
  packageId: Joi.string().required(),
  trainerId: Joi.string().required(),
  sessionDate: Joi.date().required(),
  startTime: Joi.string().required(),
  endTime: Joi.string().required(),
}).unknown(false);

export const membershipPlanValidator = Joi.object({
  name: Joi.string().required().trim(),
  price: Joi.number().positive().required(),
  durationDays: Joi.number().positive().required(),
  description: Joi.string().required().max(500),
  features: Joi.array().items(Joi.string()),
}).unknown(false);

export const gymClassValidator = Joi.object({
  name: Joi.string().required().trim(),
  description: Joi.string().max(500),
  maxCapacity: Joi.number().positive().required(),
  category: Joi.string().required(),
  level: Joi.string().valid('BEGINNER', 'INTERMEDIATE', 'ADVANCED').required(),
  trainerId: Joi.string().required(),
  image: Joi.string(),
}).unknown(false);

export const trainerProfileValidator = Joi.object({
  specialization: Joi.string().required().trim(),
  certification: Joi.string().required().trim(),
  experience: Joi.number().positive().required(),
  bio: Joi.string().max(500).trim(),
  hourlyRate: Joi.number().positive().required(),
  image: Joi.string(),
}).unknown(false);

// Validation middleware
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      return res.status(400).json({
        message: 'Validation failed',
        errors,
      });
    }

    req.body = value;
    next();
  };
};
