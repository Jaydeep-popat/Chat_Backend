import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponce.js";
import { Notification } from "../models/notification.model.js";
import { HTTP_STATUS, PAGINATION } from "../constants/index.js";

// Create a new notification
const createNotification = asyncHandler(async (req, res) => {
  const { user, message, chatRoom, type, content } = req.body;

  if (!user || !type || !content) {
    throw new apiError(HTTP_STATUS.BAD_REQUEST, "User, type, and content are required.");
  }

  const notification = await Notification.create({
    user,
    message: message || null,
    chatRoom: chatRoom || null,
    type,
    content
  });

  const populatedNotification = await Notification.findById(notification._id)
    .populate("user", "displayName profilePic username")
    .populate("message")
    .populate("chatRoom", "name");

  // Emit socket event to user
  const io = req.app.get("io");
  if (io && io.userSocketMap) {
    const userSockets = io.userSocketMap.get(user.toString());
    if (userSockets) {
      userSockets.forEach(socketId => {
        io.to(socketId).emit("new-notification", populatedNotification);
      });
    }
  }

  return res.status(HTTP_STATUS.CREATED).json(
    new apiResponse(HTTP_STATUS.CREATED, populatedNotification, "Notification created successfully")
  );
});

// Get user's notifications
const getUserNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { 
    page = PAGINATION.DEFAULT_PAGE, 
    limit = PAGINATION.DEFAULT_LIMIT,
    read = null,
    type = null
  } = req.query;

  const pageNumber = parseInt(page, 10);
  const limitNumber = Math.min(parseInt(limit, 10), PAGINATION.MAX_LIMIT);
  const skip = (pageNumber - 1) * limitNumber;

  // Build query
  const query = { user: userId, deleted: false };
  
  if (read !== null) {
    query.read = read === 'true';
  }
  
  if (type) {
    query.type = type;
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNumber)
    .populate("message")
    .populate("chatRoom", "name")
    .populate("user", "displayName profilePic username");

  const totalNotifications = await Notification.countDocuments(query);
  const unreadCount = await Notification.countDocuments({ 
    user: userId, 
    read: false, 
    deleted: false 
  });

  return res.status(HTTP_STATUS.OK).json(
    new apiResponse(HTTP_STATUS.OK, {
      notifications,
      unreadCount,
      pagination: {
        totalNotifications,
        totalPages: Math.ceil(totalNotifications / limitNumber),
        currentPage: pageNumber,
        limit: limitNumber
      }
    }, "Notifications fetched successfully")
  );
});

// Mark notification as read
const markAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  const userId = req.user._id;

  const notification = await Notification.findById(notificationId);
  
  if (!notification) {
    throw new apiError(HTTP_STATUS.NOT_FOUND, "Notification not found.");
  }

  if (notification.user.toString() !== userId.toString()) {
    throw new apiError(HTTP_STATUS.FORBIDDEN, "You can only mark your own notifications as read.");
  }

  notification.read = true;
  await notification.save();

  return res.status(HTTP_STATUS.OK).json(
    new apiResponse(HTTP_STATUS.OK, notification, "Notification marked as read")
  );
});

// Mark all notifications as read
const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await Notification.updateMany(
    { user: userId, read: false, deleted: false },
    { $set: { read: true } }
  );

  return res.status(HTTP_STATUS.OK).json(
    new apiResponse(HTTP_STATUS.OK, null, "All notifications marked as read")
  );
});

// Delete notification
const deleteNotification = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  const userId = req.user._id;

  const notification = await Notification.findById(notificationId);
  
  if (!notification) {
    throw new apiError(HTTP_STATUS.NOT_FOUND, "Notification not found.");
  }

  if (notification.user.toString() !== userId.toString()) {
    throw new apiError(HTTP_STATUS.FORBIDDEN, "You can only delete your own notifications.");
  }

  notification.deleted = true;
  await notification.save();

  return res.status(HTTP_STATUS.OK).json(
    new apiResponse(HTTP_STATUS.OK, null, "Notification deleted successfully")
  );
});

// Delete all notifications
const deleteAllNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await Notification.updateMany(
    { user: userId, deleted: false },
    { $set: { deleted: true } }
  );

  return res.status(HTTP_STATUS.OK).json(
    new apiResponse(HTTP_STATUS.OK, null, "All notifications deleted successfully")
  );
});

// Get notification counts
const getNotificationCounts = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const unreadCount = await Notification.countDocuments({
    user: userId,
    read: false,
    deleted: false
  });

  const totalCount = await Notification.countDocuments({
    user: userId,
    deleted: false
  });

  return res.status(HTTP_STATUS.OK).json(
    new apiResponse(HTTP_STATUS.OK, {
      unreadCount,
      totalCount
    }, "Notification counts fetched successfully")
  );
});

export {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getNotificationCounts
};