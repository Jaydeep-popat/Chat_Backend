import rateLimit from "express-rate-limit";
import { RATE_LIMITS } from "../constants/index.js";

// Authentication rate limiter (stricter)
export const authLimiter = rateLimit({
  windowMs: RATE_LIMITS.AUTH_WINDOW_MS, // 15 minutes
  max: RATE_LIMITS.AUTH_MAX_ATTEMPTS, // 5 attempts per window
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
    retryAfter: Math.ceil(RATE_LIMITS.AUTH_WINDOW_MS / 1000 / 60) // minutes
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Don't count successful requests
  skipFailedRequests: false, // Don't skip failed requests
  // Use default keyGenerator for IPv6 compatibility
  handler: (req, res) => {
    console.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    res.status(429).json({
      success: false,
      message: "Too many authentication attempts. Please try again later.",
      retryAfter: Math.ceil(RATE_LIMITS.AUTH_WINDOW_MS / 1000 / 60)
    });
  }
});

// General API rate limiter (more lenient)
export const generalLimiter = rateLimit({
  windowMs: RATE_LIMITS.GENERAL_WINDOW_MS, // 1 minute
  max: RATE_LIMITS.GENERAL_MAX_REQUESTS, // 100 requests per window
  message: {
    success: false,
    message: "Too many requests. Please slow down.",
    retryAfter: Math.ceil(RATE_LIMITS.GENERAL_WINDOW_MS / 1000) // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  // Use default keyGenerator for IPv6 compatibility
  handler: (req, res) => {
    console.warn(`General rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    res.status(429).json({
      success: false,
      message: "Too many requests. Please slow down.",
      retryAfter: Math.ceil(RATE_LIMITS.GENERAL_WINDOW_MS / 1000)
    });
  }
});

// File upload rate limiter (even stricter)
export const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 uploads per 5 minutes
  message: {
    success: false,
    message: "Too many file uploads. Please wait before uploading again.",
    retryAfter: 300 // 5 minutes
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  // Use default keyGenerator for IPv6 compatibility
  handler: (req, res) => {
    console.warn(`Upload rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many file uploads. Please wait before uploading again.",
      retryAfter: 300
    });
  }
});

// Message sending rate limiter
export const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  message: {
    success: false,
    message: "Too many messages sent. Please slow down.",
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  // Using default keyGenerator for IPv6 compatibility
  handler: (req, res) => {
    console.warn(`Message rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many messages sent. Please slow down.",
      retryAfter: 60
    });
  }
});