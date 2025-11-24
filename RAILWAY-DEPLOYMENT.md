# 🚀 Railway Deployment Guide for MeanMessenger Backend

## ✅ Pre-Deployment Checklist

Your backend is now **production-ready** with the following optimizations:

### 📦 **Package Configuration**
- ✅ Production `start` script using `node` instead of `nodemon`
- ✅ Node.js version requirement (>=18.0.0)
- ✅ Moved `nodemon` to `devDependencies`
- ✅ Added build script for Railway

### 🌐 **CORS Configuration**
- ✅ Support for Vercel domains (*.vercel.app)
- ✅ Support for Railway domains (*.railway.app)
- ✅ Dynamic origin handling for production
- ✅ Environment-specific CORS policies

### ⚙️ **Server Configuration**
- ✅ Railway-compatible port binding (0.0.0.0)
- ✅ Environment-specific server URLs
- ✅ Health check endpoint (`/health`)
- ✅ API info endpoint (`/api`)

### 🔧 **Socket.io Optimization**
- ✅ Enhanced CORS for real-time connections
- ✅ Railway domain support
- ✅ Production logging for debugging

---

## 🚂 **Deploy to Railway**

### **Step 1: Create Railway Account**
1. Go to [railway.app](https://railway.app)
2. Sign up with your GitHub account

### **Step 2: Deploy from GitHub**
1. Click "**New Project**" → "**Deploy from GitHub repo**"
2. Select your `MeanMessenger` repository
3. Choose "**Deploy from a folder**" → Select `BACKEND` folder
4. Railway will auto-detect your Node.js project

### **Step 3: Configure Environment Variables**
Add these variables in Railway dashboard:

```bash
# Required Environment Variables
NODE_ENV=production
MONGO_DB_URI=your-mongodb-connection-string
ACCESS_TOKEN_SECRET=your-jwt-secret-here
REFRESH_TOKEN_SECRET=your-refresh-secret-here
CORS_ORIGIN=https://your-frontend.vercel.app
FRONTEND_URL=https://your-frontend.vercel.app

# Optional (for email features)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Optional (for file uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### **Step 4: Get Your Backend URL**
After deployment, Railway will provide a URL like:
```
https://your-app-name.railway.app
```

### **Step 5: Update Frontend**
Update your Vercel frontend environment variables:
```bash
NEXT_PUBLIC_API_URL=https://your-app-name.railway.app
NEXT_PUBLIC_SOCKET_URL=https://your-app-name.railway.app
```

---

## 🔍 **Testing Your Deployment**

### **Health Check**
```bash
curl https://your-app-name.railway.app/health
```

### **API Info**
```bash
curl https://your-app-name.railway.app/api
```

### **Test WebSocket Connection**
Your frontend should now connect to the Railway backend for real-time chat.

---

## 📋 **Environment Variables Checklist**

Copy this template to Railway dashboard:

```env
NODE_ENV=production
PORT=8000
MONGO_DB_URI=mongodb+srv://username:password@cluster.mongodb.net/meanmessenger
ACCESS_TOKEN_SECRET=super-secret-jwt-key-here
REFRESH_TOKEN_SECRET=super-secret-refresh-key-here
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_EXPIRY=10d
CORS_ORIGIN=https://your-frontend.vercel.app
FRONTEND_URL=https://your-frontend.vercel.app
```

---

## 🚨 **Important Notes**

1. **Security**: Generate new JWT secrets for production
2. **Database**: Use MongoDB Atlas or Railway's database add-on
3. **Frontend**: Update your Vercel environment variables after deployment
4. **Monitoring**: Check Railway logs for any deployment issues
5. **SSL**: Railway provides automatic HTTPS certificates

---

## 🐛 **Troubleshooting**

### **Common Issues:**

**❌ CORS Errors:**
- Ensure `CORS_ORIGIN` matches your Vercel URL exactly
- Check that both HTTP and HTTPS are handled

**❌ Database Connection:**
- Verify MongoDB connection string
- Ensure IP whitelist includes Railway's IPs (or use 0.0.0.0/0)

**❌ Socket.io Issues:**
- Check browser console for WebSocket errors
- Verify CORS configuration includes Railway domain

**❌ Build Failures:**
- Check Node.js version compatibility
- Ensure all dependencies are in `package.json`

---

## 🎉 **Success!**

Your MeanMessenger backend is now production-ready and optimized for Railway deployment!

**Next Steps:**
1. Deploy to Railway
2. Test all endpoints
3. Update frontend URLs
4. Test real-time chat functionality
5. Monitor logs for any issues

---

**Need Help?** Check Railway documentation or Discord for support.