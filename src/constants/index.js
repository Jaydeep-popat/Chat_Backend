// Database name
export const DB_NAME = "chatting";

// User roles
export const USER_ROLES = Object.freeze({
  USER: "user",
  ADMIN: "admin"
});

// Message types
export const MESSAGE_TYPES = Object.freeze({
  TEXT: "text",
  IMAGE: "image",
  VIDEO: "video",
  FILE: "file"
});

// Socket events
export const SOCKET_EVENTS = Object.freeze({
  CONNECTION: "connection",
  DISCONNECT: "disconnect",
  JOIN_CHAT: "join-chat",
  JOIN_CONVERSATION: "join-conversation",
  CHAT_JOINED: "chat-joined",
  CONVERSATION_JOINED: "conversation-joined",
  RECEIVE_MESSAGE: "receive-message",
  MESSAGE_DELETED: "message-deleted",
  MESSAGE_EDITED: "message-edited",
  MESSAGE_READ: "message-read",
  USER_ONLINE: "user-online",
  USER_OFFLINE: "user-offline",
  ERROR: "error"
});

// Token expiry times (in milliseconds)
export const TOKEN_EXPIRY = Object.freeze({
  ACCESS_TOKEN: 30 * 60 * 1000, // 30 minutes
  REFRESH_TOKEN: 7 * 24 * 60 * 60 * 1000, // 7 days
});

// Token expiry times for JWT (string format)
export const JWT_EXPIRY = Object.freeze({
  ACCESS_TOKEN: "30m",
  REFRESH_TOKEN: "7d"
});

// File upload limits
export const FILE_LIMITS = Object.freeze({
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES: 1,
  FIELD_SIZE: 1024 * 1024 // 1MB
});

// Pagination defaults
export const PAGINATION = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
});

// Password validation
export const PASSWORD_RULES = Object.freeze({
  MIN_LENGTH: 8,
  MAX_LENGTH: 15,
  PATTERN: /^(?=.*[0-9])(?=.*[!@#$%^&*])/
});

// Username validation
export const USERNAME_RULES = Object.freeze({
  MIN_LENGTH: 3,
  MAX_LENGTH: 30,
  PATTERN: /^[a-zA-Z0-9_]+$/
});

// Content limits
export const CONTENT_LIMITS = Object.freeze({
  MESSAGE_MAX_LENGTH: 1000,
  DISPLAY_NAME_MAX_LENGTH: 50,
  SEARCH_QUERY_MAX_LENGTH: 100
});

// Bcrypt settings
export const BCRYPT_SETTINGS = Object.freeze({
  SALT_ROUNDS: 12,
  REFRESH_TOKEN_SALT_ROUNDS: 12
});

// Rate limiting
export const RATE_LIMITS = Object.freeze({
  AUTH_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  AUTH_MAX_ATTEMPTS: 5,
  GENERAL_WINDOW_MS: 1 * 60 * 1000, // 1 minute
  GENERAL_MAX_REQUESTS: 100
});

// Cookie settings
export const COOKIE_SETTINGS = Object.freeze({
  ACCESS_TOKEN_NAME: "accessToken",
  REFRESH_TOKEN_NAME: "refreshToken",
  SECURE_PRODUCTION: true,
  HTTP_ONLY: true, // Always httpOnly for security
  // Use 'none' for cross-site cookies in production
  SAME_SITE_PRODUCTION: "none",
  SAME_SITE_DEVELOPMENT: "lax",
  PATH: "/",
  // Let browser handle domain for cross-origin requests
  DOMAIN_PRODUCTION: undefined,
  DOMAIN_DEVELOPMENT: undefined
});

// HTTP Status codes (for consistency)
export const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
});

// Environment types
export const ENVIRONMENTS = Object.freeze({
  DEVELOPMENT: "development",
  PRODUCTION: "production",
  TEST: "test"
});

// Maximum refresh tokens per user
export const MAX_REFRESH_TOKENS_PER_USER = 3;

// Password reset / OTP handling
export const PASSWORD_RESET = Object.freeze({
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 10,
  OTP_VERIFICATION_WINDOW_MINUTES: 15,
  MAX_ATTEMPTS: 5
});