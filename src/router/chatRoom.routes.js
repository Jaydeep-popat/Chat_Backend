import { Router } from "express";
import {
  createGroupChat,
  getUserChatRooms,
  addParticipant,
  removeParticipant,
  updateGroupChat,
  updateGroupImage,
  leaveGroupChat,
  getChatRoomDetails
} from "../controllers/chatRoom.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validateObjectId } from "../middlewares/validation.middleware.js";
import { generalLimiter } from "../middlewares/rateLimiter.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = new Router();

// Create group chat
router.route("/create-group").post(
  verifyJWT,
  generalLimiter,
  upload.fields([{ name: "groupImage", maxCount: 1 }]),
  createGroupChat
);

// Get user's chat rooms
router.route("/user-rooms").get(
  verifyJWT,
  getUserChatRooms
);

// Get specific chat room details
router.route("/:roomId").get(
  verifyJWT,
  validateObjectId("roomId"),
  getChatRoomDetails
);

// Update group chat details
router.route("/:roomId").put(
  verifyJWT,
  validateObjectId("roomId"),
  upload.fields([{ name: "groupImage", maxCount: 1 }]),
  updateGroupChat
);

// Update group image specifically
router.route("/:roomId/update-image").put(
  verifyJWT,
  validateObjectId("roomId"),
  upload.fields([{ name: "groupImage", maxCount: 1 }]),
  updateGroupImage
);

// Add participant to group chat
router.route("/:roomId/add-participant").post(
  verifyJWT,
  validateObjectId("roomId"),
  addParticipant
);

// Remove participant from group chat
router.route("/:roomId/remove-participant").post(
  verifyJWT,
  validateObjectId("roomId"),
  removeParticipant
);

// Leave group chat
router.route("/:roomId/leave").post(
  verifyJWT,
  validateObjectId("roomId"),
  leaveGroupChat
);

export default router;