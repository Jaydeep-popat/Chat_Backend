import { Router } from "express";
import { sendMessage, getMessages, deleteMessage, editMessage, markAsRead, getChatList, getMsgById, getUnreadCount } from "../controllers/message.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validateSendMessage, validateGetMessages, validateEditMessage, validateMessageId } from "../middlewares/validation.middleware.js";
import { messageLimiter, uploadLimiter } from "../middlewares/rateLimiter.middleware.js";
import { get } from "mongoose";


const router = new Router();

router.route("/send-message").post(
  verifyJWT,
  messageLimiter,
  upload.fields([{ name: "file", maxCount: 1 }]),
  validateSendMessage,
  sendMessage
);

router.route("/get-messages").get(
  verifyJWT,
  validateGetMessages,
  getMessages
);


router.route("/delete-message/:messageId").delete(
  verifyJWT,
  validateMessageId,
  deleteMessage
);

router.route("/edit-message/:messageId").put(
  verifyJWT,
  validateEditMessage,
  editMessage
);

router.route("/mark-as-read/:messageId").patch(
  verifyJWT,
  validateMessageId,
  markAsRead
);

router.route("/get-chat-list").get(
  verifyJWT,
  getChatList
);

router.route("/getMsgById/:messageId").get(
  verifyJWT,
  validateMessageId,
  getMsgById
)

router.route("/getUnreadCount").get(
  verifyJWT,
  getUnreadCount
)

export default router
