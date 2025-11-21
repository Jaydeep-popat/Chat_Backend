import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { globalErrorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import { generalLimiter } from './middlewares/rateLimiter.middleware.js';

dotenv.config();
const app = express();
//  "start": "node ./src/index.js"

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Needed for file uploads
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "wss:", "ws:"], // Allow WebSocket connections
    }
  }
}));

// Apply general rate limiting to all routes
app.use(generalLimiter);

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
console.log("CORS enabled for origin:", process.env.CORS_ORIGIN);
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));
app.use(express.static("public"));
app.use(cookieParser());


import userRouter from './router/user.routes.js';
app.use("/api/users", userRouter);

import messageRouter from './router/message.routers.js';
app.use("/api/messages", messageRouter);

import chatRoomRouter from './router/chatRoom.routes.js';
app.use("/api/chat-rooms", chatRoomRouter);

import notificationRouter from './router/notification.routes.js';
app.use("/api/notifications", notificationRouter);

// 404 handler for unknown routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(globalErrorHandler);

export { app };

