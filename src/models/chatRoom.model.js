import mongoose from "mongoose";

const chatRoomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: null,
      trim: true,
      validate: {
        validator: function (v) {
          return this.isGroupChat ? v && v.trim().length > 0 : true;
        },
        message: "Group chats must have a name.",
      },
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        validate: {
          validator: function (v) {
            return v.length >= 2;
          },
          message: "A chat room must have at least two participants.",
        },
      },
    ],
    isGroupChat: {
      type: Boolean,
      default: false,
    },
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        validate: {
          validator: function (v) {
            return this.isGroupChat ? v && v.length > 0 : true;
          },
          message: "Group chats must have at least one admin.",
        },
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deleted: {
      type: Boolean,
      default: false, // For soft delete
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster querying
chatRoomSchema.index({ isGroupChat: 1 });
chatRoomSchema.index({ participants: 1 });
chatRoomSchema.index({ createdAt: -1 });
chatRoomSchema.index({ deleted: 1 });
chatRoomSchema.index({ lastMessage: 1 });

// Virtual for participants count
chatRoomSchema.virtual("participantsCount").get(function () {
  return this.participants.length;
});

// Enable virtuals in JSON and Object outputs
chatRoomSchema.set("toJSON", { virtuals: true });
chatRoomSchema.set("toObject", { virtuals: true });

// Method to add a participant
chatRoomSchema.methods.addParticipant = async function (userId) {
  if (!this.participants.includes(userId)) {
    this.participants.push(userId);
    await this.save();
  }
};

// Method to remove a participant
chatRoomSchema.methods.removeParticipant = async function (userId) {
  this.participants = this.participants.filter(
    (participant) => participant.toString() !== userId.toString()
  );
  await this.save();
};

// Middleware to exclude soft-deleted rooms
chatRoomSchema.pre("find", function () {
  this.where({ deleted: false });
});

chatRoomSchema.pre("findOne", function () {
  this.where({ deleted: false });
});

export const ChatRoom = mongoose.model("ChatRoom", chatRoomSchema);
