import { body, param, query, validationResult } from "express-validator";
import { apiError } from "../utils/apiError.js";

// Middleware to handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(`❌ Validation failed for ${req.method} ${req.path}`);
    
    const formattedErrors = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    console.log(`🔍 Validation errors:`, formattedErrors);
    
    // Create a more detailed error message
    const errorMessages = formattedErrors.map(err => `${err.field}: ${err.message}`).join(', ');
    const detailedMessage = `Validation failed - ${errorMessages}`;
    
    throw new apiError(400, detailedMessage, formattedErrors);
  }
  
  console.log(`✅ Validation passed for ${req.method} ${req.path}`);
  next();
};

// User validation rules
export const validateRegister = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),
  
  body("displayName")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Display name must be between 1 and 50 characters"),
  
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  
  body("password")
    .isLength({ min: 8, max: 15 })
    .withMessage("Password must be between 8 and 15 characters")
    .matches(/^(?=.*[0-9])(?=.*[!@#$%^&*])/)
    .withMessage("Password must contain at least one number and one special character"),
  
  body("role")
    .optional()
    .isIn(["user", "admin"])
    .withMessage("Role must be either 'user' or 'admin'"),
  
  handleValidationErrors
];

export const validateLogin = [
  body("email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  
  body("username")
    .optional()
    .trim()
    .isLength({ min: 3 })
    .withMessage("Username must be at least 3 characters"),
  
  body("password")
    .notEmpty()
    .withMessage("Password is required"),
  
  // Custom validation to ensure either email or username is provided
  body().custom((value, { req }) => {
    if (!req.body.email && !req.body.username) {
      throw new Error("Either email or username is required");
    }
    return true;
  }),
  
  handleValidationErrors
];

export const validateUpdateAccount = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores"),
  
  body("displayName")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Display name must be between 1 and 50 characters"),
  
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),
  
  handleValidationErrors
];

export const validateChangePassword = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  
  body("newPassword")
    .isLength({ min: 8, max: 15 })
    .withMessage("New password must be between 8 and 15 characters")
    .matches(/^(?=.*[0-9])(?=.*[!@#$%^&*])/)
    .withMessage("New password must contain at least one number and one special character"),
  
  handleValidationErrors
];

export const validateForgotPasswordRequest = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),

  handleValidationErrors
];

export const validateVerifyPasswordResetOTP = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),

  body("otp")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits")
    .matches(/^\d+$/)
    .withMessage("OTP must only contain numbers"),

  handleValidationErrors
];

export const validateResetForgottenPassword = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),

  body("newPassword")
    .isLength({ min: 8, max: 15 })
    .withMessage("New password must be between 8 and 15 characters")
    .matches(/^(?=.*[0-9])(?=.*[!@#$%^&*])/)
    .withMessage("New password must contain at least one number and one special character"),

  handleValidationErrors
];

// Message validation rules
export const validateSendMessage = [
  body("messageType")
    .isIn(["text", "image", "video", "file"])
    .withMessage("Message type must be one of: text, image, video, file"),
  
  body("content")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Message content cannot exceed 1000 characters"),
  
  body("receiver")
    .optional()
    .isMongoId()
    .withMessage("Receiver must be a valid user ID"),
  
  body("room")
    .optional()
    .isMongoId()
    .withMessage("Room must be a valid room ID"),
  
  // Custom validation for message type and content
  body().custom((value, { req }) => {
    const { messageType, content, receiver, room } = req.body;
    
    if (!receiver && !room) {
      throw new Error("Either receiver or room must be provided");
    }
    
    if (receiver && room) {
      throw new Error("Cannot specify both receiver and room");
    }
    
    if (messageType === "text" && (!content || content.trim().length === 0)) {
      throw new Error("Text messages must have content");
    }
    
    return true;
  }),
  
  handleValidationErrors
];

export const validateGetMessages = [
  query("receiver")
    .optional()
    .isMongoId()
    .withMessage("Receiver must be a valid user ID"),
  
  query("room")
    .optional()
    .isMongoId()
    .withMessage("Room must be a valid room ID"),
  
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  
  query("search")
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Search query cannot exceed 100 characters"),
  
  // Custom validation to ensure either receiver or room is provided
  query().custom((value, { req }) => {
    if (!req.query.receiver && !req.query.room) {
      throw new Error("Either receiver or room must be provided");
    }
    return true;
  }),
  
  handleValidationErrors
];

export const validateEditMessage = [
  param("messageId")
    .isMongoId()
    .withMessage("Message ID must be a valid MongoDB ObjectId"),
  
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Content is required")
    .isLength({ max: 1000 })
    .withMessage("Content cannot exceed 1000 characters"),
  
  handleValidationErrors
];

export const validateMessageId = [
  param("messageId")
    .isMongoId()
    .withMessage("Message ID must be a valid MongoDB ObjectId"),
  
  handleValidationErrors
];

// MongoDB ObjectId validation for params
export const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`${paramName} must be a valid MongoDB ObjectId`),
  
  handleValidationErrors
];