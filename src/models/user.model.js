import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    displayName: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: [true, "password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
      maxlength: [15, "Password cannot exceed 15 characters"],
      match: [/^(?=.*[0-9])(?=.*[!@#$%^&*])/, "Password must contain a number and a special character"],
    },
    profilePic: {
      type: String,
      default: "https://res.cloudinary.com/dpe33dh2p/image/upload/v1739092385/awiexgnmmdhah2edp2oe.jpg",
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    resetPasswordOTP: String,
    resetPasswordOTPExpiresAt: Date,
    resetPasswordOTPVerified: {
      type: Boolean,
      default: false,
    },
    resetPasswordOTPVerifiedAt: Date,
    resetPasswordOTPAttemptCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt fields automatically
  }
);

// Change the salt rounds to be dynamic
const saltRounds = process.env.BCRYPT_SALT_ROUNDS || 10; // Default to 10 if not set

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    const salt = await bcrypt.genSalt(Number(saltRounds));  // Convert the value to number
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Indexes for better query performance    
userSchema.index({ isOnline: 1 });

export const User = mongoose.model("User", userSchema)
