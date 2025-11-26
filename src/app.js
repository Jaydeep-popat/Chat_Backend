import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import fs from 'fs';
import { globalErrorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import { generalLimiter } from './middlewares/rateLimiter.middleware.js';

dotenv.config();  

// Ensure required directories exist (important for cloud deployment)
const ensureDirectories = () => {
  const directories = ['./public', './public/temp'];
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
};

// Initialize directories
ensureDirectories();

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
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:3001', 
            'https://chatflow-flax.vercel.app',
            process.env.FRONTEND_URL,
            process.env.CORS_ORIGIN
        ].filter(Boolean);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('🚫 CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true, // Essential for cross-domain cookies
    optionsSuccessStatus: 200, // For legacy browser support
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With', 
        'Accept', 
        'Origin',
        'Cookie',
        'Set-Cookie'
    ],
    exposedHeaders: ['Set-Cookie'],
    optionsSuccessStatus: 200,
    preflightContinue: false
}))
console.log("CORS enabled for origins:", [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.CORS_ORIGIN,
    process.env.FRONTEND_URL,
    'Vercel domains (*.vercel.app)',
    'Railway domains (*.railway.app)',
    'Render domains (*.onrender.com)',
    'Fly.io domains (*.fly.dev)',
    'Cyclic domains (*.cyclic.app)',
    'Koyeb domains (*.koyeb.app)'
].filter(Boolean));
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Root endpoint - Welcome message
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to MeanMessenger Backend API! 🚀',
    status: 'Running',
    endpoints: {
      health: '/health',
      api: '/api',
      users: '/api/users',
      messages: '/api/messages',
      chatRooms: '/api/chat-rooms'
    },
    documentation: 'Check /api for more details'
  });
});

// Health check endpoint for Railway/Docker
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    name: 'MeanMessenger Backend API',
    version: '1.0.0',
    status: 'Running',
    endpoints: {
      users: '/api/users',
      messages: '/api/messages',
      chatRooms: '/api/chat-rooms'
    }
  });
});

import userRouter from './router/user.routes.js';
app.use("/api/users", userRouter);

import messageRouter from './router/message.routers.js';
app.use("/api/messages", messageRouter);

import chatRoomRouter from './router/chatRoom.routes.js';
app.use("/api/chat-rooms",chatRoomRouter);

// 404 handler for unknown routes
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(globalErrorHandler);

export { app };

