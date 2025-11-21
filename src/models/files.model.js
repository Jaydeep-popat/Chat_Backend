import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    uploader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^https?:\/\/.+\..+/.test(v); // Basic URL validation
        },
        message: "Invalid file URL.",
      },
    },
    publicId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["image", "video", "file"],
      required: true,
    },
    size: {
      type: Number, // in bytes
      validate: {
        validator: function (v) {
          return v >= 0;
        },
        message: "File size must be a positive number.",
      },
    },
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    deleted: {
      type: Boolean,
      default: false, // For soft delete if needed
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Indexes for faster queries
fileSchema.index({ uploader: 1 });
fileSchema.index({ type: 1 });
fileSchema.index({ createdAt: -1 });
fileSchema.index({ deleted: 1 });
fileSchema.index({ message: 1 }); // Index for message field

// Middleware to exclude soft-deleted files
fileSchema.pre("find", function () {
  this.where({ deleted: false });
});

fileSchema.pre("findOne", function () {
  this.where({ deleted: false });
});

fileSchema.pre("findOneAndUpdate", function () {
  this.where({ deleted: false });
});

fileSchema.pre("updateMany", function () {
  this.where({ deleted: false });
});

// Method to soft delete a file
fileSchema.methods.softDelete = async function () {
  this.deleted = true;
  await this.save();
};

// Method to restore a soft-deleted file
fileSchema.methods.restore = async function () {
  this.deleted = false;
  await this.save();
};

export const File = mongoose.model("File", fileSchema);