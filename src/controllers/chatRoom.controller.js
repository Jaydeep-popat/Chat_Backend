import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponce.js";
import { ChatRoom } from "../models/chatRoom.model.js";
import { User } from "../models/user.model.js";
import { Message } from "../models/Message.model.js";
import { uploadOnCloudinary } from "../utils/clodinary.js";
import { HTTP_STATUS, PAGINATION } from "../constants/index.js";

// Create a new group chat room
const createGroupChat = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  let { participants } = req.body;
  const createdBy = req.user._id;

  console.log(`👥 Group chat creation attempt by user: ${createdBy}`);
  console.log(`📝 Group details: Name="${name}", Description="${description}"`);

  if (!name || !name.trim()) {
    console.log("❌ Group creation failed: No name provided");
    throw new apiError(HTTP_STATUS.BAD_REQUEST, "Group chat name is required.");
  }

  // Parse participants if it's a string (from FormData)
  if (typeof participants === 'string') {
    try {
      participants = JSON.parse(participants);
      console.log(`🔄 Parsed participants from string: ${participants.length} users`);
    } catch (error) {
      console.log("❌ Group creation failed: Invalid participants JSON format");
      throw new apiError(HTTP_STATUS.BAD_REQUEST, "Invalid participants format.");
    }
  }

  if (!participants || !Array.isArray(participants) || participants.length < 1) {
    console.log("❌ Group creation failed: No participants provided");
    throw new apiError(HTTP_STATUS.BAD_REQUEST, "At least one other participant is required.");
  }

  console.log(`✅ Group validation passed: ${participants.length} participants`);

  // Handle group image upload if provided
  let groupImageUrl = null;
  if (req.files?.groupImage?.[0]?.path) {
    const groupImagePath = req.files.groupImage[0].path;
    const uploadedImage = await uploadOnCloudinary(groupImagePath);
    if (uploadedImage) {
      groupImageUrl = uploadedImage.url;
    }
  }

  // Add creator to participants if not already included
  const allParticipants = [...new Set([...participants, createdBy.toString()])];

  // Verify all participants exist
  const existingUsers = await User.find({ _id: { $in: allParticipants } });
  if (existingUsers.length !== allParticipants.length) {
    throw new apiError(HTTP_STATUS.BAD_REQUEST, "One or more participants not found.");
  }

  const chatRoom = await ChatRoom.create({
    name: name.trim(),
    description: description?.trim() || null,
    groupImage: groupImageUrl,
    participants: allParticipants,
    isGroupChat: true,
    admins: [createdBy],
    createdBy
  });

  const populatedRoom = await ChatRoom.findById(chatRoom._id)
    .populate("participants", "displayName profilePic username")
    .populate("admins", "displayName profilePic username")
    .populate("createdBy", "displayName profilePic username");

  // Emit socket event to all participants
  const io = req.app.get("io");
  if (io && io.userSocketMap) {
    allParticipants.forEach(participantId => {
      const userSockets = io.userSocketMap.get(participantId.toString());
      if (userSockets) {
        userSockets.forEach(socketId => {
          io.to(socketId).emit("group-chat-created", populatedRoom);
        });
      }
    });
  }

  return res.status(HTTP_STATUS.CREATED).json(
    new apiResponse(HTTP_STATUS.CREATED, populatedRoom, "Group chat created successfully")
  );
});

// Get user's chat rooms
const getUserChatRooms = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT } = req.query;

  const pageNumber = parseInt(page, 10);
  const limitNumber = Math.min(parseInt(limit, 10), PAGINATION.MAX_LIMIT);

  const skip = (pageNumber - 1) * limitNumber;

  const chatRooms = await ChatRoom.find({
    participants: userId,
    deleted: false
  })
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limitNumber)
    .populate("participants", "displayName profilePic username")
    .populate("admins", "displayName profilePic username")
    .populate("lastMessage")
    .populate("createdBy", "displayName profilePic username");

  const totalRooms = await ChatRoom.countDocuments({
    participants: userId,
    deleted: false
  });

  return res.status(HTTP_STATUS.OK).json(
    new apiResponse(HTTP_STATUS.OK, {
      chatRooms,
      pagination: {
        totalRooms,
        totalPages: Math.ceil(totalRooms / limitNumber),
        currentPage: pageNumber,
        limit: limitNumber
      }
    }, "Chat rooms fetched successfully")
  );
});

// Add participant to group chat
const addParticipant = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { userId: newUserId } = req.body;
  const currentUserId = req.user._id;

  if (!newUserId) {
    throw new apiError(HTTP_STATUS.BAD_REQUEST, "User ID is required.");
  }

  const chatRoom = await ChatRoom.findById(roomId);
  if (!chatRoom) {
    throw new apiError(HTTP_STATUS.NOT_FOUND, "Chat room not found.");
  }

  if (!chatRoom.isGroupChat) {
    throw new apiError(HTTP_STATUS.BAD_REQUEST, "Can only add participants to group chats.");
  }

  // Check if current user is admin
  if (!chatRoom.admins.includes(currentUserId)) {
    throw new apiError(HTTP_STATUS.FORBIDDEN, "Only admins can add participants.");
  }

  // Check if user exists
  const newUser = await User.findById(newUserId);
  if (!newUser) {
    throw new apiError(HTTP_STATUS.NOT_FOUND, "User not found.");
  }

  // Check if user is already a participant
  if (chatRoom.participants.includes(newUserId)) {
    return res.status(HTTP_STATUS.OK).json(
      new apiResponse(HTTP_STATUS.OK, null, "User is already a participant.")
    );
  }

  // Add participant
  chatRoom.participants.push(newUserId);
  await chatRoom.save();

  const updatedRoom = await ChatRoom.findById(roomId)
    .populate("participants", "displayName profilePic username")
    .populate("admins", "displayName profilePic username");

  // Emit socket event
  const io = req.app.get("io");
  if (io && io.userSocketMap) {
    // Notify new user
    const newUserSockets = io.userSocketMap.get(newUserId.toString());
    if (newUserSockets) {
      newUserSockets.forEach(socketId => {
        io.to(socketId).emit("added-to-group", updatedRoom);
      });
    }

    // Notify existing participants
    chatRoom.participants.forEach(participantId => {
      const userSockets = io.userSocketMap.get(participantId.toString());
      if (userSockets) {
        userSockets.forEach(socketId => {
          io.to(socketId).emit("participant-added", { 
            roomId, 
            newUser: { _id: newUserId, displayName: newUser.displayName, profilePic: newUser.profilePic, username: newUser.username }
          });
        });
      }
    });
  }

  return res.status(HTTP_STATUS.OK).json(
    new apiResponse(HTTP_STATUS.OK, updatedRoom, "Participant added successfully")
  );
});

// Remove participant from group chat
const removeParticipant = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { userId: targetUserId } = req.body;
  const currentUserId = req.user._id;

  if (!targetUserId) {
    throw new apiError(HTTP_STATUS.BAD_REQUEST, "User ID is required.");
  }

  const chatRoom = await ChatRoom.findById(roomId);
  if (!chatRoom) {
    throw new apiError(HTTP_STATUS.NOT_FOUND, "Chat room not found.");
  }

  if (!chatRoom.isGroupChat) {
    throw new apiError(HTTP_STATUS.BAD_REQUEST, "Can only remove participants from group chats.");
  }

  // Check if current user is admin or removing themselves
  if (!chatRoom.admins.includes(currentUserId) && currentUserId.toString() !== targetUserId) {
    throw new apiError(HTTP_STATUS.FORBIDDEN, "Only admins can remove other participants.");
  }

  // Check if user is a participant
  if (!chatRoom.participants.includes(targetUserId)) {
    throw new apiError(HTTP_STATUS.BAD_REQUEST, "User is not a participant.");
  }

  // Remove participant and admin status if applicable
  chatRoom.participants = chatRoom.participants.filter(p => p.toString() !== targetUserId);
  chatRoom.admins = chatRoom.admins.filter(a => a.toString() !== targetUserId);

  // If removing the creator and there are other participants, make the first participant an admin
  if (chatRoom.createdBy.toString() === targetUserId && chatRoom.participants.length > 0) {
    if (chatRoom.admins.length === 0) {
      chatRoom.admins.push(chatRoom.participants[0]);
    }
  }

  await chatRoom.save();

  // Emit socket event
  const io = req.app.get("io");
  if (io && io.userSocketMap) {
    // Notify removed user
    const removedUserSockets = io.userSocketMap.get(targetUserId.toString());
    if (removedUserSockets) {
      removedUserSockets.forEach(socketId => {
        io.to(socketId).emit("removed-from-group", { roomId });
      });
    }

    // Notify remaining participants
    chatRoom.participants.forEach(participantId => {
      const userSockets = io.userSocketMap.get(participantId.toString());
      if (userSockets) {
        userSockets.forEach(socketId => {
          io.to(socketId).emit("participant-removed", { roomId, removedUserId: targetUserId });
        });
      }
    });
  }

  return res.status(HTTP_STATUS.OK).json(
    new apiResponse(HTTP_STATUS.OK, null, "Participant removed successfully")
  );
});

// Update group chat details
const updateGroupChat = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const { name, description } = req.body;
  const currentUserId = req.user._id;

  const chatRoom = await ChatRoom.findById(roomId);
  if (!chatRoom) {
    throw new apiError(HTTP_STATUS.NOT_FOUND, "Chat room not found.");
  }

  if (!chatRoom.isGroupChat) {
    throw new apiError(HTTP_STATUS.BAD_REQUEST, "Can only update group chats.");
  }

  // Check if current user is admin
  if (!chatRoom.admins.includes(currentUserId)) {
    throw new apiError(HTTP_STATUS.FORBIDDEN, "Only admins can update group details.");
  }

  // Handle group image upload if provided
  let groupImageUrl = chatRoom.groupImage; // Keep existing image if no new one
  if (req.files?.groupImage?.[0]?.path) {
    const groupImagePath = req.files.groupImage[0].path;
    const uploadedImage = await uploadOnCloudinary(groupImagePath);
    if (uploadedImage) {
      groupImageUrl = uploadedImage.url;
    }
  }

  // Update fields
  if (name && name.trim()) {
    chatRoom.name = name.trim();
  }
  if (description !== undefined) {
    chatRoom.description = description?.trim() || null;
  }
  chatRoom.groupImage = groupImageUrl;
  
  await chatRoom.save();

  const updatedRoom = await ChatRoom.findById(roomId)
    .populate("participants", "displayName profilePic username")
    .populate("admins", "displayName profilePic username");

  // Emit socket event
  const io = req.app.get("io");
  if (io && io.userSocketMap) {
    chatRoom.participants.forEach(participantId => {
      const userSockets = io.userSocketMap.get(participantId.toString());
      if (userSockets) {
        userSockets.forEach(socketId => {
          io.to(socketId).emit("group-updated", updatedRoom);
        });
      }
    });
  }

  return res.status(HTTP_STATUS.OK).json(
    new apiResponse(HTTP_STATUS.OK, updatedRoom, "Group chat updated successfully")
  );
});

// Delete/leave group chat
const leaveGroupChat = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const currentUserId = req.user._id;

  const chatRoom = await ChatRoom.findById(roomId);
  if (!chatRoom) {
    throw new apiError(HTTP_STATUS.NOT_FOUND, "Chat room not found.");
  }

  if (!chatRoom.isGroupChat) {
    throw new apiError(HTTP_STATUS.BAD_REQUEST, "Can only leave group chats.");
  }

  // Check if user is a participant
  if (!chatRoom.participants.includes(currentUserId)) {
    throw new apiError(HTTP_STATUS.BAD_REQUEST, "You are not a participant in this chat.");
  }

  // If creator is leaving and there are other participants, transfer ownership
  if (chatRoom.createdBy.toString() === currentUserId.toString() && chatRoom.participants.length > 1) {
    // Make the first admin the new creator, or first participant if no other admins
    const newCreator = chatRoom.admins.find(admin => admin.toString() !== currentUserId.toString()) || 
                      chatRoom.participants.find(p => p.toString() !== currentUserId.toString());
    
    chatRoom.createdBy = newCreator;
    
    // Ensure new creator is an admin
    if (!chatRoom.admins.includes(newCreator)) {
      chatRoom.admins.push(newCreator);
    }
  }

  // Remove user from participants and admins
  chatRoom.participants = chatRoom.participants.filter(p => p.toString() !== currentUserId.toString());
  chatRoom.admins = chatRoom.admins.filter(a => a.toString() !== currentUserId.toString());

  // If no participants left, soft delete the room
  if (chatRoom.participants.length === 0) {
    chatRoom.deleted = true;
  }

  await chatRoom.save();

  // Emit socket event
  const io = req.app.get("io");
  if (io && io.userSocketMap) {
    // Notify remaining participants
    chatRoom.participants.forEach(participantId => {
      const userSockets = io.userSocketMap.get(participantId.toString());
      if (userSockets) {
        userSockets.forEach(socketId => {
          io.to(socketId).emit("participant-left", { roomId, leftUserId: currentUserId });
        });
      }
    });
  }

  return res.status(HTTP_STATUS.OK).json(
    new apiResponse(HTTP_STATUS.OK, null, "Left group chat successfully")
  );
});

// Get specific chat room details
const getChatRoomDetails = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const currentUserId = req.user._id;

  const chatRoom = await ChatRoom.findById(roomId)
    .populate("participants", "displayName profilePic username isOnline")
    .populate("admins", "displayName profilePic username")
    .populate("createdBy", "displayName profilePic username")
    .populate("lastMessage");

  if (!chatRoom) {
    throw new apiError(HTTP_STATUS.NOT_FOUND, "Chat room not found.");
  }

  // Check if user is the creator (always allow creator access)
  const isCreator = (chatRoom.createdBy._id ? chatRoom.createdBy._id.toString() : chatRoom.createdBy.toString()) === currentUserId.toString();

  // Check if user is a participant (handle both populated and unpopulated participants)
  const isParticipant = chatRoom.participants.some(participant => {
    // Handle populated participants (objects with _id)
    if (participant && typeof participant === 'object' && participant._id) {
      return participant._id.toString() === currentUserId.toString();
    }
    // Handle unpopulated participants (ObjectIds)
    return participant.toString() === currentUserId.toString();
  });
  
  // Allow access if user is creator OR participant
  if (!isCreator && !isParticipant) {
    throw new apiError(HTTP_STATUS.FORBIDDEN, "You are not a participant in this chat.");
  }

  return res.status(HTTP_STATUS.OK).json(
    new apiResponse(HTTP_STATUS.OK, chatRoom, "Chat room details fetched successfully")
  );
});

// Update group image specifically
const updateGroupImage = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const currentUserId = req.user._id;

  const chatRoom = await ChatRoom.findById(roomId);
  if (!chatRoom) {
    throw new apiError(HTTP_STATUS.NOT_FOUND, "Chat room not found.");
  }

  if (!chatRoom.isGroupChat) {
    throw new apiError(HTTP_STATUS.BAD_REQUEST, "Can only update group chat images.");
  }

  // Check if current user is admin
  if (!chatRoom.admins.includes(currentUserId)) {
    throw new apiError(HTTP_STATUS.FORBIDDEN, "Only admins can update group image.");
  }

  // Handle group image upload
  if (!req.files?.groupImage?.[0]?.path) {
    throw new apiError(HTTP_STATUS.BAD_REQUEST, "Group image file is required.");
  }

  const groupImagePath = req.files.groupImage[0].path;
  const uploadedImage = await uploadOnCloudinary(groupImagePath);
  
  if (!uploadedImage) {
    throw new apiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to upload group image.");
  }

  chatRoom.groupImage = uploadedImage.url;
  await chatRoom.save();

  const updatedRoom = await ChatRoom.findById(roomId)
    .populate("participants", "displayName profilePic username")
    .populate("admins", "displayName profilePic username");

  // Emit socket event
  const io = req.app.get("io");
  if (io && io.userSocketMap) {
    chatRoom.participants.forEach(participantId => {
      const userSockets = io.userSocketMap.get(participantId.toString());
      if (userSockets) {
        userSockets.forEach(socketId => {
          io.to(socketId).emit("group-updated", updatedRoom);
        });
      }
    });
  }

  return res.status(HTTP_STATUS.OK).json(
    new apiResponse(HTTP_STATUS.OK, updatedRoom, "Group image updated successfully")
  );
});

export {
  createGroupChat,
  getUserChatRooms,
  addParticipant,
  removeParticipant,
  updateGroupChat,
  updateGroupImage,
  leaveGroupChat,
  getChatRoomDetails
};