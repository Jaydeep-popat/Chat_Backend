import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { Message } from "../models/Message.model.js";
import { ChatRoom } from "../models/chatRoom.model.js";
import jwt from "jsonwebtoken";
import cookie from "cookie";

const userSocketMap = new Map();

// Function to auto-join user to existing conversations and group chats
const autoJoinExistingConversations = async (userId, socket, io) => {
  try {
    // Find all DM conversations where this user is a participant
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: userId },
            { receiver: userId }
          ],
          room: null // Only DM messages
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

    // Join each DM conversation room
    conversations.forEach((conv) => {
      const otherUserId = conv._id;
      const roomId = [userId, otherUserId].sort().join("-");
      
      if (!socket.joinedRooms.has(roomId)) {
        socket.join(roomId);
        socket.joinedRooms.add(roomId);
        // Auto-joined user to conversation room
      }
    });

    // Find and join all group chats where user is a participant
    const groupChats = await ChatRoom.find({
      participants: userId,
      isGroupChat: true,
      deleted: false
    });

    groupChats.forEach((room) => {
      const roomId = room._id.toString();
      if (!socket.joinedRooms.has(roomId)) {
        socket.join(roomId);
        socket.joinedRooms.add(roomId);
        console.log(`🏠 Auto-joined user ${userId} to group chat ${room.name} (${roomId})`);
      }
    });

  } catch (error) {
    console.error('Error auto-joining user to conversations:', error);
  }
};

export const initSocket = (io) => {
  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      
      const cookies = socket.handshake.headers.cookie
        ? cookie.parse(socket.handshake.headers.cookie)
        : {};
      
      // Only accept tokens from cookies (more secure than query params)
      const token = cookies.accessToken;
      if (!token) {
        throw new apiError(401, "Unauthorized", "No access token provided in cookies.");
      }

      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      socket.userId = decoded._id;

      const user = await User.findById(socket.userId).select("_id");
      if (!user) {
        throw new apiError(401, "User not found");
      }
      
      next();
    } catch (err) {
      next({ status: err.status || 401, message: err.message || "Auth error" });
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;

    // Track multiple sockets per user
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId).add(socket.id);
    
    // User socket mapping updated

    // Update user's online status when they connect
    User.findByIdAndUpdate(userId, { isOnline: true }, { new: true })
      .then(async (updatedUser) => {
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
        // Error updating online status
      });

    // Socket connected for user

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
          // User joined room
        }

        socket.emit("chat-joined", { roomId });
      } catch (err) {
        // Join room error
        socket.emit("error", { status: err.status || 400, message: err.message });
      }
    });



    /**
     * JOIN ROOM FOR NEW CONVERSATION
     * This ensures both users are in the same room when a new conversation starts
     */
    socket.on("join-conversation", ({ targetUserId }) => {
      try {
        // User requesting to join conversation
        
        if (!targetUserId) {
          throw new apiError(400, "Target user ID required.");
        }

        const roomId = [userId.toString(), targetUserId.toString()].sort().join("-");
        // Room ID for conversation

        if (!socket.joinedRooms.has(roomId)) {
          socket.join(roomId);
          socket.joinedRooms.add(roomId);
          // User joined conversation room
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
                // Target user auto-joined room
              }
            }
          });
        }

        socket.emit("conversation-joined", { roomId, targetUserId });
        // Emitted conversation-joined event
      } catch (err) {
        // Join conversation error
        socket.emit("error", { status: err.status || 400, message: err.message });
      }
    });

    /**
     * JOIN GROUP CHAT ROOM
     */
    socket.on("join-group", ({ roomId }) => {
      try {
        // User joining group room
        
        if (!roomId) {
          throw new apiError(400, "Room ID required.");
        }

        // TODO: Verify user is a member of this room from database
        
        socket.join(roomId);
        if (!socket.joinedRooms) socket.joinedRooms = new Set();
        socket.joinedRooms.add(roomId);
        
        socket.emit("group-joined", { roomId });
        // User joined group room
      } catch (err) {
        // Join group error
        socket.emit("error", { status: err.status || 400, message: err.message });
      }
    });

    /**
     * SEND PRIVATE MESSAGE VIA SOCKET
     */
    socket.on("send-private-message", async ({ targetUserId, content, messageType = "text" }) => {
      try {
        // User sending message
        
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

        // Message sent
      } catch (err) {
        // Send private message error
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
          
          // Ensure both users are in the room
          if (!socket.joinedRooms) socket.joinedRooms = new Set();
          if (!socket.joinedRooms.has(roomIdGenerated)) {
            socket.join(roomIdGenerated);
            socket.joinedRooms.add(roomIdGenerated);
          }
          
          // Ensure target user is also in room if online
          const targetUserSockets = userSocketMap.get(targetUserId.toString());
          if (targetUserSockets) {
            targetUserSockets.forEach((targetSocketId) => {
              const targetSocket = io.sockets.sockets.get(targetSocketId);
              if (targetSocket) {
                if (!targetSocket.joinedRooms) targetSocket.joinedRooms = new Set();
                if (!targetSocket.joinedRooms.has(roomIdGenerated)) {
                  targetSocket.join(roomIdGenerated);
                  targetSocket.joinedRooms.add(roomIdGenerated);
                }
              }
            });
          }
          
          socket.to(roomIdGenerated).emit("user-typing", { 
            userId: userId.toString(), 
            isTyping: true 
          });
        } else if (roomId) {
          // Group chat typing - ensure user is in the room
          if (!socket.joinedRooms) socket.joinedRooms = new Set();
          if (!socket.joinedRooms.has(roomId)) {
            socket.join(roomId);
            socket.joinedRooms.add(roomId);
          }
          
          socket.to(roomId).emit("user-typing", { 
            userId: userId.toString(), 
            isTyping: true,
            roomId 
          });
        }
      } catch (err) {
        socket.emit("error", { status: err.status || 400, message: err.message });
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
        socket.emit("error", { status: err.status || 400, message: err.message });
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
              // User is now offline
              
              // Broadcast to all connected users that this user is offline
              io.emit("user-offline", { userId: userId.toString() });
            })
            .catch((err) => {
              // Error updating offline status
            });
        }
      }
      // User disconnected
    });
  });

  io.userSocketMap = userSocketMap; // expose for controller usage
};