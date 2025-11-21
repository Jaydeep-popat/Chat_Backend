import { Router } from "express";
import {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getNotificationCounts
} from "../controllers/notification.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validateObjectId } from "../middlewares/validation.middleware.js";
import { generalLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = new Router();

// Get user's notifications
router.route("/").get(
  verifyJWT,
  getUserNotifications
);

// Get notification counts
router.route("/counts").get(
  verifyJWT,
  getNotificationCounts
);

// Create notification (admin only - could add admin middleware)
router.route("/create").post(
  verifyJWT,
  generalLimiter,
  createNotification
);

// Mark specific notification as read
router.route("/:notificationId/read").patch(
  verifyJWT,
  validateObjectId("notificationId"),
  markAsRead
);

// Mark all notifications as read
router.route("/read-all").patch(
  verifyJWT,
  markAllAsRead
);

// Delete specific notification
router.route("/:notificationId").delete(
  verifyJWT,
  validateObjectId("notificationId"),
  deleteNotification
);

// Delete all notifications
router.route("/delete-all").delete(
  verifyJWT,
  deleteAllNotifications
);

export default router;