import logger from '../utils/logger.js';
import { HTTP_STATUS } from '../constants/index.js';

/**
 * Global error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || HTTP_STATUS.INTERNAL_ERROR;

  logger.error({
    message: err.message,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    userId: req.userId,
    stack: err.stack,
  });

  // Handle specific error types
  let errorResponse = {
    success: false,
    message: err.message,
  };

  // MongoDB validation errors
  if (err.name === 'ValidationError') {
    err.statusCode = HTTP_STATUS.BAD_REQUEST;
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    errorResponse.errors = errors;
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    err.statusCode = HTTP_STATUS.CONFLICT;
    const field = Object.keys(err.keyPattern)[0];
    errorResponse.message = `${field} already exists`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    err.statusCode = HTTP_STATUS.UNAUTHORIZED;
    errorResponse.message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    err.statusCode = HTTP_STATUS.UNAUTHORIZED;
    errorResponse.message = 'Token expired';
  }

  // Stripe errors
  if (err.type === 'StripeInvalidRequestError') {
    err.statusCode = HTTP_STATUS.BAD_REQUEST;
    errorResponse.message = 'Payment processing error: ' + err.message;
  }

  // AI Service errors
  if (err.message && (err.message.includes('AI') || err.message.includes('AI API'))) {
    err.statusCode = HTTP_STATUS.INTERNAL_ERROR;
    errorResponse.message = 'AI service temporarily unavailable';
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(err.statusCode).json(errorResponse);
};

/**
 * 404 handler
 */
export const notFoundHandler = (req, res) => {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    message: `Route ${req.path} not found`,
  });
};
