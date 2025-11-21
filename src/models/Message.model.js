import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatRoom",
      default: null,
    },
    content: {
      type: String,
      default: "",
      validate: {
        validator: function (v) {
          return this.messageType !== "text" || v.trim().length > 0;
        },
        message: "Text messages must have content.",
      },
    },
    fileUrl: {
        type: String,
        default: null,
        validate: {
          validator: function (v) {
            return this.messageType === "text" || (typeof v === "string" && v.trim().length > 0);
          },
          message: "File messages must have a valid file URL.",
        },
      },
      
      messageType: {
        type: String,
        enum: ["text", "image", "video", "file"],
        required: true,
      },
      
      isEdited:{
        type:Boolean,
        default:false,
      },
      
    read: {
      type: Boolean,
      default: false,
    },
    deleted: {
      type: Boolean,
      default: false, // For soft delete
    },
    
    readBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    }],
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

// Indexes for quick search and sorting
messageSchema.index({ sender: 1 });
messageSchema.index({ receiver: 1 });
messageSchema.index({ room: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ read: 1 });

// Method to mark a message as read
messageSchema.methods.markAsRead = async function () {
  this.read = true;
  await this.save();
};

export const Message = mongoose.model("Message", messageSchema);
