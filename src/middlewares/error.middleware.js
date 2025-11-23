import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponce.js";

// Global error handler middleware
export const globalErrorHandler = (err, req, res, next) => {
  let error = err;

  // If it's not already an apiError, convert it
  if (!(error instanceof apiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    error = new apiError(statusCode, message, [], err.stack);
  }

  // Log error for debugging (only in development)
  if (process.env.NODE_ENV === "development") {
    console.error("🚨 Error Details:", {
      statusCode: error.statusCode,
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  } else {
    // In production, log only essential info
    console.error("Error:", {
      statusCode: error.statusCode,
      message: error.message,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }

  // Handle specific MongoDB errors
  if (error.name === "CastError") {
    const message = "Invalid ID format";
    error = new apiError(400, message);
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    const message = `${field} already exists`;
    error = new apiError(409, message);
  }

  if (error.name === "ValidationError") {
    const message = Object.values(error.errors).map(val => val.message).join(", ");
    error = new apiError(400, message);
  }

  if (error.name === "JsonWebTokenError") {
    const message = "Invalid token. Please login again.";
    error = new apiError(401, message);
  }

  if (error.name === "TokenExpiredError") {
    const message = "Token expired. Please login again.";
    error = new apiError(401, message);
  }

  // Handle Multer errors
  if (error.code === "LIMIT_FILE_SIZE") {
    const message = "File size too large. Maximum size is 10MB.";
    error = new apiError(400, message);
  }

  if (error.code === "LIMIT_FILE_COUNT") {
    const message = "Too many files. Maximum 1 file allowed.";
    error = new apiError(400, message);
  }

  if (error.code === "LIMIT_UNEXPECTED_FILE") {
    const message = "Unexpected file field.";
    error = new apiError(400, message);
  }

  // Prepare response based on environment
  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    // Always show validation errors for better debugging
    ...(error.errors && error.errors.length > 0 && { errors: error.errors }),
    // Only show stack trace in development
    ...(process.env.NODE_ENV === "development" && { stack: error.stack })
  };

  res.status(error.statusCode).json(response);
};

// 404 handler middleware (should be placed after all routes)
export const notFoundHandler = (req, res, next) => {
  const message = `Route ${req.originalUrl} not found`;
  next(new apiError(404, message));
};

// Async error wrapper for controllers
export const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};