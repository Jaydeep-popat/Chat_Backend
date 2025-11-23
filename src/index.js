import dotenv from "dotenv";
dotenv.config();
import http from "http";
import connectDB from "./db/index.js";
import { Server } from "socket.io";
import { initSocket } from "./socket/index.js";
import { app } from "./app.js"

connectDB()
  .then(() => {
    console.log("server started at the port "+process.env.PORT);
    const server = http.createServer(app);
    // Socket.IO CORS Configuration (matching Express CORS)
    const allowedOrigins = [
      process.env.CORS_ORIGIN,
      'http://localhost:3000',
      'http://localhost:3001',
      'https://localhost:3000',
    ];

    if (process.env.VERCEL_URL) {
      allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
    }
    if (process.env.FRONTEND_URL) {
      allowedOrigins.push(process.env.FRONTEND_URL);
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
          
          if (origin.includes('.vercel.app')) {
            return callback(null, true);
          }
          
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

    // Socket.IO CORS enabled

    initSocket(io);

    // Attach the socket instance to the app
    app.set("io", io);

    // Start the HTTP server
    server.listen(process.env.PORT, () => {
      // Server running
    });

    // Handle server shutdown gracefully
    process.on("SIGINT", () => {
      // Shutting down server
      io.close(() => {
        // Socket.IO server closed
        process.exit(0);
      });
    });
  })
  .catch((err) => {
    // MongoDB connection failed
  });