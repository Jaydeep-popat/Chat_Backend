# 🚀 Vercel Deployment Guide - MeanMessenger Backend

## Prerequisites
- Vercel CLI installed: `npm i -g vercel`
- MongoDB Atlas account (for production database)
- Cloudinary account (for file uploads)

## 📋 Backend Deployment Steps

### 1. Prepare Environment Variables

Create a `.env` file with production values:

```bash
# Server Configuration
PORT=8000
NODE_ENV=production

# Database Configuration (MongoDB Atlas)
MONGO_DB_URI=mongodb+srv://username:password@cluster.mongodb.net/meanmessenger

# CORS Configuration
CORS_ORIGIN=https://your-frontend-app.vercel.app
FRONTEND_URL=https://your-frontend-app.vercel.app

# JWT Configuration
ACCESS_TOKEN_SECRET="your-super-secret-access-token-key"
ACCESS_TOKEN_EXPIRY=1800000
REFRESH_TOKEN_SECRET="your-super-secret-refresh-token-key"
REFRESH_TOKEN_EXPIRY=604800000

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# SMTP Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-specific-password"
SMTP_FROM="MeanMessenger <your-email@gmail.com>"
```

### 2. Deploy Backend to Vercel

```bash
# Login to Vercel
vercel login

# Deploy (from backend directory)
cd BACKEND
vercel --prod

# Set environment variables
vercel env add MONGO_DB_URI
vercel env add ACCESS_TOKEN_SECRET
vercel env add REFRESH_TOKEN_SECRET
vercel env add CLOUDINARY_CLOUD_NAME
vercel env add CLOUDINARY_API_KEY
vercel env add CLOUDINARY_API_SECRET
vercel env add SMTP_USER
vercel env add SMTP_PASS
vercel env add CORS_ORIGIN
vercel env add FRONTEND_URL
```

### 3. Update vercel.json

Replace `your-frontend-app.vercel.app` in `vercel.json` with your actual frontend URL.

### 4. Frontend Configuration

Update your frontend's API base URL to point to your deployed backend:

```javascript
// In your frontend's API configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-app.vercel.app'
  : 'http://localhost:8000';
```

## 📱 Frontend Deployment Steps

### 1. Update Next.js Configuration

Create/update `next.config.js` in your frontend:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    API_BASE_URL: process.env.NODE_ENV === 'production' 
      ? 'https://your-backend-app.vercel.app'
      : 'http://localhost:8000'
  },
  images: {
    domains: ['res.cloudinary.com'], // For Cloudinary images
  },
  // Enable SWC minification for better performance
  swcMinify: true,
  
  // Handle WebSocket connections
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NODE_ENV === 'production' 
          ? 'https://your-backend-app.vercel.app/api/:path*'
          : 'http://localhost:8000/api/:path*'
      }
    ];
  },
};

export default nextConfig;
```

### 2. Update API Configuration

Update your frontend's axios configuration:

```javascript
// utils/api.js
import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-app.vercel.app'
  : 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export default api;
```

### 3. Deploy Frontend

```bash
# From frontend directory
cd FRONTEND
vercel --prod

# Set environment variables if needed
vercel env add NEXT_PUBLIC_API_URL https://your-backend-app.vercel.app
```

## 🔧 Important Configuration Notes

### 1. Cookie Settings
Ensure cookies work across domains by updating auth controller:

```javascript
// In auth.controller.js
const cookieOptions = {
  httpOnly: false, // For socket authentication
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Cross-site cookies
  domain: process.env.NODE_ENV === 'production' ? '.vercel.app' : undefined,
  maxAge: TOKEN_EXPIRY.ACCESS_TOKEN
};
```

### 2. Socket.IO Configuration
Update frontend socket connection:

```javascript
// utils/socket.js
const SOCKET_URL = process.env.NODE_ENV === 'production'
  ? 'https://your-backend-app.vercel.app'
  : 'http://localhost:8000';

const socket = io(SOCKET_URL, {
  withCredentials: true,
  transports: ['websocket', 'polling'],
});
```

## 🐛 Troubleshooting

### Common Issues:

1. **CORS Errors**
   - Verify CORS_ORIGIN and FRONTEND_URL environment variables
   - Check that both HTTP and HTTPS versions are included

2. **Cookie Issues**
   - Ensure `sameSite: 'none'` and `secure: true` in production
   - Check domain settings for cross-site cookies

3. **Socket.IO Connection Issues**
   - Ensure both websocket and polling transports are enabled
   - Check CORS configuration for Socket.IO

4. **Environment Variables**
   - Verify all required environment variables are set in Vercel dashboard
   - Use `vercel env ls` to list current environment variables

### Useful Commands:

```bash
# Check deployment status
vercel ls

# View logs
vercel logs

# Redeploy
vercel --prod

# Set environment variable
vercel env add VARIABLE_NAME

# Remove environment variable
vercel env rm VARIABLE_NAME
```

## 🔐 Security Checklist

- [ ] Use strong JWT secrets
- [ ] Enable HTTPS in production
- [ ] Set secure cookie options
- [ ] Configure proper CORS origins
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting
- [ ] Validate all inputs
- [ ] Use HTTPS for database connections

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [MongoDB Atlas Setup](https://www.mongodb.com/atlas)
- [Cloudinary Setup](https://cloudinary.com/documentation)