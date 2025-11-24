import dotenv from "dotenv";
dotenv.config();
import http from "http";
import connectDB from "./db/index.js";
import { Server } from "socket.io";
import { initSocket } from "./socket/index.js";
import { app } from "./app.js"

connectDB()
  .then(() => {
    console.log(`🚀 Server starting on port ${process.env.PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 CORS Origin: ${process.env.CORS_ORIGIN}`);
    
    const server = http.createServer(app);
    // Socket.IO CORS Configuration (matching Express CORS)
    const allowedOrigins = [
      process.env.CORS_ORIGIN,
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'https://localhost:3000',
    ];

    if (process.env.VERCEL_URL) {
      allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
    }
    if (process.env.RAILWAY_STATIC_URL) {
      allowedOrigins.push(process.env.RAILWAY_STATIC_URL);
    }
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
      allowedOrigins.push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
    }

    const validOrigins = allowedOrigins.filter(origin => origin && origin !== 'undefined');

    const io = new Server(server, {
      cors: {
        origin: function (origin, callback) {
          if (!origin) return callback(null, true);
          
          if (validOrigins.includes(origin)) {
            return callback(null, true);
          }
          
          if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
            return callback(null, true);
          }
          
          if (origin.includes('.vercel.app') || 
              origin.includes('.railway.app') || 
              origin.includes('.onrender.com') || 
              origin.includes('.fly.dev') || 
              origin.includes('.cyclic.app') || 
              origin.includes('.koyeb.app')) {
            return callback(null, true);
          }
          
          console.log(`❌ CORS blocked origin: ${origin}`);
          return callback(new Error('Not allowed by CORS'), false);
        },
        credentials: true,
        methods: ["GET", "POST"]
      },
      transports: ["websocket", "polling"],
      allowEIO3: true,
      pingTimeout: 60000,
      pingInterval: 25000
    });

    console.log(`🌐 Socket.IO initialized with CORS origins: ${validOrigins.join(', ')}`);

    initSocket(io);

    // Attach the socket instance to the app
    app.set("io", io);

    // Start the HTTP server
    const port = process.env.PORT || 8000;
    server.listen(port, '0.0.0.0', () => {
      console.log(`✅ Server is running on port ${port}`);
      if (process.env.NODE_ENV === 'production') {
        console.log(`🌐 Production server running on Railway`);
      } else {
        console.log(`🔗 Local server URL: http://localhost:${port}`);
      }
    });

    // Handle server shutdown gracefully
    process.on("SIGINT", () => {
      console.log("\n🛑 Shutting down server gracefully...");
      io.close(() => {
        console.log("✅ Socket.IO server closed");
        console.log("👋 Server shutdown complete");
        process.exit(0);
      });
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    console.error("🔍 Full error:", err);
    process.exit(1);
  });