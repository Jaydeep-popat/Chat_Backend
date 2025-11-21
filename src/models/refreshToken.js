import mongoose from "mongoose";
import bcrypt from "bcrypt";

const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: () => Date.now() + 7 * 24 * 60 * 60 * 1000, // Default to 7 days
    },
    revoked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt fields
  }
);

// Hash the token before saving
refreshTokenSchema.pre("save", async function (next) {
  if (!this.isModified("token")) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.token = await bcrypt.hash(this.token, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare tokens
refreshTokenSchema.methods.compareToken = async function (candidateToken) {
  return bcrypt.compare(candidateToken, this.token);
};

// Method to check if the token is expired
refreshTokenSchema.methods.isExpired = function () {
  return Date.now() > this.expiresAt;
};

// Indexes for better query performance
refreshTokenSchema.index({ user: 1 });
refreshTokenSchema.index({ token: 1 });

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
