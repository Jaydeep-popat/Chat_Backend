import dotenv from "dotenv";
dotenv.config();
import http from "http";
import connectDB from "./db/index.js";
import { Server } from "socket.io";
import { initSocket } from "./socket/index.js";
import { app } from "./app.js";

connectDB()
  .then(() => {
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN,
        credentials: true
      },
      transports: ["websocket", "polling"], // Allow polling fallback
      allowEIO3: true // Enable backwards compatibility
    });

    initSocket(io);

    // Attach the socket instance to the app
    app.set("io", io);

    // Start the HTTP server
    server.listen(process.env.PORT, () => {
      console.log(`🚀 Server is running on port ${process.env.PORT}`);
    });

    // Handle server shutdown gracefully
    process.on("SIGINT", () => {
      console.log("Shutting down server...");
      io.close(() => {
        console.log("Socket.IO server closed.");
        process.exit(0);
      });
    });
  })
  .catch((err) => {
    console.log("❌ MongoDB connection failed:", err);
  });