import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { Message } from "../models/Message.model.js";
import jwt from "jsonwebtoken";
import cookie from "cookie";

const userSocketMap = new Map();

// Function to auto-join user to existing conversations
const autoJoinExistingConversations = async (userId, socket, io) => {
  try {
    console.log(`🔍 Auto-joining user ${userId} to existing conversations...`);
    
    // Find all conversations where this user is a participant
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: userId },
            { receiver: userId }
          ]
        }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$sender", userId] },
              "$receiver",
              "$sender"
            ]
          },
          lastMessage: { $last: "$$ROOT" }
        }
      }
    ]);

    console.log(`📋 Found ${conversations.length} existing conversations for user ${userId}`);

    // Join each conversation room
    conversations.forEach((conv) => {
      const otherUserId = conv._id;
      const roomId = [userId, otherUserId].sort().join("-");
      
      if (!socket.joinedRooms.has(roomId)) {
        socket.join(roomId);
        socket.joinedRooms.add(roomId);
        console.log(`✅ Auto-joined user ${userId} to conversation room ${roomId} with user ${otherUserId}`);
      } else {
        console.log(`ℹ️ User ${userId} already in room ${roomId}`);
      }
    });

    console.log(`✅ Auto-join complete for user ${userId}`);
  } catch (error) {
    console.error(`❌ Error auto-joining user ${userId} to conversations:`, error);
  }
};

export const initSocket = (io) => {
  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      console.log('🔐 Socket authentication attempt:', {
        socketId: socket.id,
        hasHeaders: !!socket.handshake.headers,
        hasCookies: !!socket.handshake.headers.cookie,
        userAgent: socket.handshake.headers['user-agent']?.substring(0, 50)
      });
      
      const cookies = socket.handshake.headers.cookie
        ? cookie.parse(socket.handshake.headers.cookie)
        : {};

      console.log('🍪 Parsed cookies:', Object.keys(cookies));
      
      // Only accept tokens from cookies (more secure than query params)
      const token = cookies.accessToken;
      if (!token) {
        console.error('❌ No access token found in cookies');
        throw new apiError(401, "Unauthorized", "No access token provided in cookies.");
      }
      
      console.log('✅ Token found, length:', token.length);

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      socket.userId = decoded._id;
      console.log('✅ Token decoded, userId:', decoded._id);

      const user = await User.findById(socket.userId).select("_id");
      if (!user) {
        console.error('❌ User not found in database:', socket.userId);
        throw new apiError(404, "User not found.");
      }
      
      console.log('✅ User authenticated successfully:', socket.userId);
      next();
    } catch (err) {
      console.error("Socket authentication error:", err.message);
      next({ status: err.status || 401, message: err.message || "Auth error" });
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;
    console.log('🎉 Socket connection established:', {
      userId,
      socketId: socket.id,
      totalConnections: io.engine.clientsCount
    });

    // Track multiple sockets per user
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId).add(socket.id);
    
    console.log('👥 User socket mapping updated:', {
      userId,
      socketCount: userSocketMap.get(userId).size,
      totalUsers: userSocketMap.size
    });

    // Update user's online status when they connect
    User.findByIdAndUpdate(userId, { isOnline: true }, { new: true })
      .then(async (updatedUser) => {
        console.log(`🟢 User ${userId} is now online`);
        console.log(`📡 Broadcasting user-online event for user ${userId}`);
        
        // Auto-join user to existing conversations where they're a participant
        await autoJoinExistingConversations(userId, socket, io);
        
        // Broadcast to all connected users that this user is online
        io.emit("user-online", { userId: userId.toString() });
        
        // Send current user their own status
        socket.emit("connection-confirmed", { 
          userId: userId.toString(), 
          status: "online",
          message: "Connected successfully" 
        });
      })
      .catch((err) => {
        console.error("Error updating online status:", err);
      });

    console.log(`🔌 Socket connected for user ${userId}. Total sockets for this user:`, userSocketMap.get(userId)?.size || 0);

    // Track rooms user has joined (optional but safe)
    socket.joinedRooms = new Set();

    /**
     * JOIN PRIVATE ROOM between two users
     */
    socket.on("join-chat", ({ targetUserId }) => {
      try {
        if (!targetUserId) {
          throw new apiError(400, "Target user ID required.");
        }

        const roomId = [userId, targetUserId].sort().join("-");

        if (!socket.joinedRooms.has(roomId)) {
          socket.join(roomId);
          socket.joinedRooms.add(roomId);
          console.log(`User ${userId} joined room ${roomId}`);
        }

        socket.emit("chat-joined", { roomId });
      } catch (err) {
        console.error("Join room error:", err.message);
        socket.emit("error", { status: err.status || 400, message: err.message });
      }
    });



    /**
     * JOIN ROOM FOR NEW CONVERSATION
     * This ensures both users are in the same room when a new conversation starts
     */
    socket.on("join-conversation", ({ targetUserId }) => {
      try {
        console.log(`📨 User ${userId} requesting to join conversation with ${targetUserId}`);
        
        if (!targetUserId) {
          throw new apiError(400, "Target user ID required.");
        }

        const roomId = [userId.toString(), targetUserId.toString()].sort().join("-");
        console.log(`🏠 Room ID for conversation: ${roomId}`);

        if (!socket.joinedRooms.has(roomId)) {
          socket.join(roomId);
          socket.joinedRooms.add(roomId);
          console.log(`✅ User ${userId} joined conversation room ${roomId}`);
        }

        // Also ensure the target user joins the room if they're online
        const targetUserSockets = userSocketMap.get(targetUserId.toString());
        
        if (targetUserSockets) {
          targetUserSockets.forEach((targetSocketId) => {
            const targetSocket = io.sockets.sockets.get(targetSocketId);
            if (targetSocket) {
              if (!targetSocket.joinedRooms) targetSocket.joinedRooms = new Set();
              if (!targetSocket.joinedRooms.has(roomId)) {
                targetSocket.join(roomId);
                targetSocket.joinedRooms.add(roomId); 
                console.log(`✅ Target user ${targetUserId} auto-joined room ${roomId}`);
              }
            }
          });
        }

        socket.emit("conversation-joined", { roomId, targetUserId });
        console.log(`📤 Emitted conversation-joined event to user ${userId}`);
      } catch (err) {
        console.error("❌ Join conversation error:", err.message);
        socket.emit("error", { status: err.status || 400, message: err.message });
      }
    });

    /**
     * JOIN GROUP CHAT ROOM
     */
    socket.on("join-group", ({ roomId }) => {
      try {
        console.log(`👥 User ${userId} joining group room ${roomId}`);
        
        if (!roomId) {
          throw new apiError(400, "Room ID required.");
        }

        // TODO: Verify user is a member of this room from database
        
        socket.join(roomId);
        if (!socket.joinedRooms) socket.joinedRooms = new Set();
        socket.joinedRooms.add(roomId);
        
        socket.emit("group-joined", { roomId });
        console.log(`✅ User ${userId} joined group room ${roomId}`);
      } catch (err) {
        console.error("❌ Join group error:", err.message);
        socket.emit("error", { status: err.status || 400, message: err.message });
      }
    });

    /**
     * SEND PRIVATE MESSAGE VIA SOCKET
     */
    socket.on("send-private-message", async ({ targetUserId, content, messageType = "text" }) => {
      try {
        console.log(`📨 User ${userId} sending message to ${targetUserId}`);
        
        if (!targetUserId || !content) {
          throw new apiError(400, "Target user ID and content required.");
        }

        // Save message to database
        const newMessage = await Message.create({
          sender: userId,
          receiver: targetUserId,
          content,
          messageType,
        });

        const populatedMessage = await Message.findById(newMessage._id).populate(
          "sender",
          "displayName profilePic username"
        );

        const roomId = [userId, targetUserId].sort().join("-");

        // Ensure both users are in the room
        if (!socket.joinedRooms) socket.joinedRooms = new Set();
        if (!socket.joinedRooms.has(roomId)) {
          socket.join(roomId);
          socket.joinedRooms.add(roomId);
        }

        // Join target user to room if online
        const targetUserSockets = userSocketMap.get(targetUserId.toString());
        if (targetUserSockets) {
          targetUserSockets.forEach((targetSocketId) => {
            const targetSocket = io.sockets.sockets.get(targetSocketId);
            if (targetSocket) {
              if (!targetSocket.joinedRooms) targetSocket.joinedRooms = new Set();
              if (!targetSocket.joinedRooms.has(roomId)) {
                targetSocket.join(roomId);
                targetSocket.joinedRooms.add(roomId);
              }
              // Emit directly to receiver
              targetSocket.emit("receive-private-message", populatedMessage);
            }
          });
        }

        // Send confirmation to sender
        socket.emit("message-sent", {
          messageId: newMessage._id,
          to: targetUserId,
          timestamp: newMessage.createdAt,
        });

        console.log(`✅ Message sent from ${userId} to ${targetUserId}`);
      } catch (err) {
        console.error("❌ Send private message error:", err.message);
        socket.emit("error", { status: err.status || 400, message: err.message });
      }
    });

    /**
     * TYPING INDICATOR
     */
    socket.on("typing-start", ({ targetUserId, roomId }) => {
      try {
        if (targetUserId) {
          // Direct message typing
          const roomIdGenerated = [userId.toString(), targetUserId.toString()].sort().join("-");
          socket.to(roomIdGenerated).emit("user-typing", { 
            userId: userId.toString(), 
            isTyping: true 
          });
        } else if (roomId) {
          // Group chat typing
          socket.to(roomId).emit("user-typing", { 
            userId: userId.toString(), 
            isTyping: true,
            roomId 
          });
        }
      } catch (err) {
        console.error("❌ Typing start error:", err.message);
      }
    });

    socket.on("typing-stop", ({ targetUserId, roomId }) => {
      try {
        if (targetUserId) {
          // Direct message typing
          const roomIdGenerated = [userId.toString(), targetUserId.toString()].sort().join("-");
          socket.to(roomIdGenerated).emit("user-typing", { 
            userId: userId.toString(), 
            isTyping: false 
          });
        } else if (roomId) {
          // Group chat typing
          socket.to(roomId).emit("user-typing", { 
            userId: userId.toString(), 
            isTyping: false,
            roomId 
          });
        }
      } catch (err) {
        console.error("❌ Typing stop error:", err.message);
      }
    });

    /**
     * HANDLE DISCONNECT
     */
    socket.on("disconnect", () => {
      if (userSocketMap.has(userId)) {
        userSocketMap.get(userId).delete(socket.id);
        if (userSocketMap.get(userId).size === 0) {
          userSocketMap.delete(userId);
          
          // Update user's offline status when all their sockets disconnect
          User.findByIdAndUpdate(userId, { isOnline: false }, { new: true })
            .then((updatedUser) => {
              console.log(`🔴 User ${userId} is now offline`);
              
              // Broadcast to all connected users that this user is offline
              io.emit("user-offline", { userId: userId.toString() });
            })
            .catch((err) => {
              console.error("Error updating offline status:", err);
            });
        }
      }
      console.log(`🔌 User ${userId} disconnected. Active sockets:`, userSocketMap.get(userId)?.size || 0);
    });
  });

  io.userSocketMap = userSocketMap; // expose for controller usage
};