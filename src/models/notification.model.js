import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    chatRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoom",
      default: null,
    },
    type: {
      type: String,
      enum: ["message", "adminAction", "mention", "system"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (v) {
          return v.trim().length > 0;
        },
        message: "Notification content cannot be empty.",
      },
    },
    read: {
      type: Boolean,
      default: false,
    },
    deleted: {
      type: Boolean,
      default: false, // For soft delete
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Indexes for faster lookups
notificationSchema.index({ user: 1 });
notificationSchema.index({ chatRoom: 1 });
notificationSchema.index({ read: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ user: 1, read: 1, deleted: 1 });

// Method to mark notification as read
notificationSchema.methods.markAsRead = async function () {
  this.read = true;
  await this.save();
};

// Static method to mark all notifications as read
notificationSchema.statics.markAllAsRead = async function (userId) {
  await this.updateMany({ user: userId, read: false }, { $set: { read: true } });
};

// Middleware to exclude soft-deleted notifications
notificationSchema.pre("find", function () {
  this.where({ deleted: false });
});

notificationSchema.pre("findOne", function () {
  this.where({ deleted: false });
});

export const Notification = mongoose.model("Notification", notificationSchema);
