import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponce.js"
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/clodinary.js";
import { generateAccessToken, generateRefreshToken } from "../utils/token.js";
import { RefreshToken } from "../models/refreshToken.js";
import { TOKEN_EXPIRY, HTTP_STATUS, MAX_REFRESH_TOKENS_PER_USER, COOKIE_SETTINGS, ENVIRONMENTS, PASSWORD_RESET } from "../constants/index.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { sendMail } from "../utils/mailer.js";

const generateNumericOTP = (length = PASSWORD_RESET.OTP_LENGTH) => {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
};

const buildResetPasswordEmail = (name, otp) => {
  const safeName = name || "there";
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <p>Hi ${safeName},</p>
      <p>We received a request to reset your MeanMessenger password.</p>
      <p style="font-size: 18px; font-weight: bold;">Your OTP: ${otp}</p>
      <p>This code will expire in ${PASSWORD_RESET.OTP_EXPIRY_MINUTES} minutes. Do not share it with anyone.</p>
      <p>If you did not request a password reset, you can safely ignore this email.</p>
      <p>Best regards,<br />MeanMessenger Team</p>
    </div>
  `;
};

const registerUser = asyncHandler(async (req, res) => {
  console.log("👤 User registration attempt started");
  console.log(`📧 Registration request for email: ${req.body.email}`);

  const { username, displayName, email, password, role } = req.body;

  if ([username, displayName, email, password, role].some(field => !field)) {
    console.log("❌ Registration failed: Missing required fields");
    throw new apiError(400, "All fields are required");
  }

  console.log(`🔍 Checking for existing user with username: ${username} or email: ${email}`);
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    console.log(`❌ Registration failed: User already exists (${existedUser.email})`);
    throw new apiError(409, "User with email or username already exists");
  }

  let profilePic = undefined;
  

  const profilePicLocalPath = req.files?.profilePic?.[0]?.path;
  // Profile picture path logged

  if (profilePicLocalPath) {
    const uploadedImage = await uploadOnCloudinary(profilePicLocalPath);

    if (!uploadedImage) {
      throw new apiError(500, "Failed to upload profile picture.");
    } else {
      profilePic = uploadedImage.url;
    }
  }

  const user = await User.create({
    username,
    displayName,
    email,
    password,
    profilePic,
    role
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if (!createdUser) {
    throw new apiError(409, "something went wrong while creating user");
  }

  // 🔐 Generate tokens
  const accessToken = generateAccessToken(createdUser);
  const refreshToken = generateRefreshToken(createdUser);

  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // or use process.env.REFRESH_TOKEN_EXPIRY

  await RefreshToken.create({
    user: createdUser._id,
    token: refreshToken,
    expiresAt: refreshTokenExpiry,
  });

  return res
    .status(201)
    .json(new apiResponse(200, {
      user: createdUser,
      tokens: {
        accessToken,
        refreshToken,
      },
    },
      "user registerd successfully"
    ))
});

const loginUser = asyncHandler(async (req, res) => {
  console.log("🔑 User login attempt started");
  
  const { email, username, password } = req.body;

  if (!username && !email) {
    console.log("❌ Login failed: No username or email provided");
    throw new apiError(400, "username or email is required.");
  }
  if (!password) {
    console.log("❌ Login failed: No password provided");
    throw new apiError(400, "please provide the password.");
  }

  const loginIdentifier = username || email;
  console.log(`🔍 Login attempt for: ${loginIdentifier}`);

  const user = username
    ? await User.findOne({ username }).select("+password") 
    : await User.findOne({ email }).select("+password");

  if (!user) {
    console.log(`❌ Login failed: User not found for identifier: ${loginIdentifier}`);
    throw new apiError(404, "User not found with the provided email or username.")
  }

  console.log(`🔐 Validating password for user: ${user.username} (${user.email})`);
  const isPasswordValid = await user.comparePassword(password); 

  if (!isPasswordValid) {
    console.log(`❌ Login failed: Invalid password for user: ${user.username}`);
    throw new apiError(401, "Invalid user credentials");
  }

  console.log(`✅ Password validation successful for user: ${user.username}`);

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);


  // Set user as online when they log in
  const loggedInUser = await User.findByIdAndUpdate(
    user._id, 
    { isOnline: true }, 
    { new: true }
  ).select("-password");

  // Determine environment and origin
  const isProduction = process.env.NODE_ENV === ENVIRONMENTS.PRODUCTION;
  const origin = req.get('Origin') || req.get('Referer') || '';
  const isLocalhostOrigin = origin.includes('localhost');
  const isVercelOrigin = origin.includes('.vercel.app') || origin === process.env.FRONTEND_URL;
  
  console.log('🍪 Production cookie configuration:', {
    nodeEnv: process.env.NODE_ENV,
    isProduction,
    origin,
    isLocalhostOrigin,
    isVercelOrigin,
    frontendUrl: process.env.FRONTEND_URL
  });

  // Production configuration for HTTPS Vercel ↔ HTTPS Render
  // Use secure cookies with SameSite=None for cross-origin HTTPS
  const cookieConfig = {
    secure: isProduction && !isLocalhostOrigin, // Secure for production HTTPS, not for localhost dev
    sameSite: isProduction && !isLocalhostOrigin ? "none" : "lax" // None for production cross-origin, lax for dev
  };

  // Access token options - allow JavaScript access for socket authentication
  const accessTokenOptions = {
    httpOnly: false, // Allow JavaScript access for socket.io
    secure: cookieConfig.secure,
    sameSite: cookieConfig.sameSite,
    maxAge: TOKEN_EXPIRY.ACCESS_TOKEN,
  };

  // Refresh token options - keep httpOnly for security
  const refreshTokenOptions = {
    httpOnly: COOKIE_SETTINGS.HTTP_ONLY, // Keep httpOnly for security
    secure: cookieConfig.secure,
    sameSite: cookieConfig.sameSite,
    maxAge: TOKEN_EXPIRY.REFRESH_TOKEN,
  };

  console.log('🍪 Final cookie options:', { accessTokenOptions, refreshTokenOptions });

  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // or from env

  const tokens = await RefreshToken.find({ user: user._id });

  try {
    const tokens = await RefreshToken.find({ user: user._id }).sort({ createdAt: 1 });

    if (tokens.length >= MAX_REFRESH_TOKENS_PER_USER) {
      const oldestToken = tokens[0];
      await RefreshToken.findByIdAndDelete(oldestToken._id);
    }
  } catch (err) {
    // Failed to delete oldest token
  }

  await RefreshToken.create({
    user: user._id,
    token: refreshToken,
    expiresAt: refreshTokenExpiry,
  });

  return res
    .status(200)
    .cookie("accessToken", accessToken, accessTokenOptions)
    .cookie("refreshToken", refreshToken, refreshTokenOptions)
    .json(
      new apiResponse(
        200,
        { user: loggedInUser, tokens: { accessToken, refreshToken, } },
        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {

  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    throw new apiError(400, "Refresh token not found in cookies");
  }

  // First verify the JWT to get user ID
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (error) {
    throw new apiError(403, "Invalid refresh token");
  }

  // Only search tokens for this specific user (much more efficient)
  const userTokens = await RefreshToken.find({ 
    user: decoded._id, 
    revoked: false 
  });

  let matchedToken = null;

  for (const dbToken of userTokens) {
    const isMatch = await bcrypt.compare(refreshToken, dbToken.token);
    if (isMatch) {
      matchedToken = dbToken;
      break;
    }
  }

  if (!matchedToken) {
    throw new apiError(404, "Refresh token not found or already deleted");
  }

  await RefreshToken.findByIdAndDelete(matchedToken._id);
  
  // Set user as offline when they log out
  await User.findByIdAndUpdate(decoded._id, { isOnline: false });

  // Use the same cookie configuration logic as login
  const isProductionBackend = process.env.NODE_ENV === ENVIRONMENTS.PRODUCTION;
  const isCrossOriginDev = isProductionBackend && req.get('Origin')?.includes('localhost');
  
  const cookieConfig = isCrossOriginDev ? {
    secure: false,
    sameSite: "lax"
  } : {
    secure: isProductionBackend,
    sameSite: isProductionBackend ? "none" : "lax"
  };

  res
    .clearCookie("accessToken", {
      httpOnly: false, // Match the login cookie settings
      secure: cookieConfig.secure,
      sameSite: cookieConfig.sameSite
    })
    .clearCookie("refreshToken", {
      httpOnly: COOKIE_SETTINGS.HTTP_ONLY,
      secure: cookieConfig.secure,
      sameSite: cookieConfig.sameSite
    });

  return res
    .status(200)
    .json(
      new apiResponse(
        200,
        null,
        "User logged out successfully"
      )
    );
});

const getAlluser = asyncHandler(async (req, res) => {

  const users = await User.find({}).select("-password -refreshToken");
  return res
    .status(200)
    .json(new apiResponse(200, users, "All users fetched successfully."));
});

const getOnlineUsers = asyncHandler(async (req, res) => {
  const onlineUsers = await User.find({ isOnline: true }).select("-password -refreshToken");
  return res
    .status(200)
    .json(new apiResponse(200, onlineUsers, "Online users fetched successfully."));
});



const searchUsers = asyncHandler(async (req, res) => {
  const { q, page = 1, limit = 10 } = req.query;
  const currentUserId = req.user._id;

  if (!q || q.trim().length < 2) {
    throw new apiError(400, "Search query must be at least 2 characters long.");
  }

  const pageNumber = parseInt(page, 10);
  const limitNumber = Math.min(parseInt(limit, 10), 50); // Max 50 results
  const skip = (pageNumber - 1) * limitNumber;

  const searchRegex = new RegExp(q.trim(), 'i');
  
  const users = await User.find({
    _id: { $ne: currentUserId }, // Exclude current user
    $or: [
      { username: { $regex: searchRegex } },
      { displayName: { $regex: searchRegex } },
      { email: { $regex: searchRegex } }
    ]
  })
    .select("username displayName email profilePic isOnline")
    .limit(limitNumber)
    .skip(skip)
    .sort({ username: 1 });

  const totalResults = await User.countDocuments({
    _id: { $ne: currentUserId },
    $or: [
      { username: { $regex: searchRegex } },
      { displayName: { $regex: searchRegex } },
      { email: { $regex: searchRegex } }
    ]
  });

  return res.status(200).json(
    new apiResponse(200, {
      users,
      pagination: {
        totalResults,
        totalPages: Math.ceil(totalResults / limitNumber),
        currentPage: pageNumber,
        limit: limitNumber
      }
    }, "Users found successfully.")
  );
});

const changeCurrentPassword = asyncHandler(async (req, res) => {

  const { currentPassword, newPassword } = req.body;

  const userId = req.user._id;
  const user = await User.findById(userId).select("+password");


  const isPasswordValid = await user.comparePassword(currentPassword);

  if (!isPasswordValid) {
    throw new apiError(401, "Invalid current password.");
  }

  user.password = newPassword;
  await user.save();
  return res
    .status(200)
    .json(new apiResponse(200, null, "Password changed successfully."));
});

const requestPasswordReset = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new apiError(HTTP_STATUS.BAD_REQUEST, "Email is required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new apiError(HTTP_STATUS.NOT_FOUND, "No account found with this email");
  }

  const otp = generateNumericOTP();
  const hashedOtp = await bcrypt.hash(otp, 10);

  user.resetPasswordOTP = hashedOtp;
  user.resetPasswordOTPExpiresAt = new Date(Date.now() + PASSWORD_RESET.OTP_EXPIRY_MINUTES * 60 * 1000);
  user.resetPasswordOTPVerified = false;
  user.resetPasswordOTPVerifiedAt = undefined;
  user.resetPasswordOTPAttemptCount = 0;

  await user.save({ validateBeforeSave: false });

  try {
    await sendMail({
      to: email,
      subject: "MeanMessenger Password Reset OTP",
      text: `Your MeanMessenger OTP is ${otp}. It expires in ${PASSWORD_RESET.OTP_EXPIRY_MINUTES} minutes.`,
      html: buildResetPasswordEmail(user.displayName || user.username, otp)
    });
  } catch (error) {
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpiresAt = undefined;
    user.resetPasswordOTPAttemptCount = 0;
    await user.save({ validateBeforeSave: false });

    // Failed to send password reset email
    throw new apiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, "Failed to send OTP. Please try again.");
  }

  return res
    .status(HTTP_STATUS.OK)
    .json(new apiResponse(HTTP_STATUS.OK, null, "OTP sent to registered email."));
});

const verifyPasswordResetOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new apiError(HTTP_STATUS.BAD_REQUEST, "Email and OTP are required");
  }

  const user = await User.findOne({ email });

  if (!user || !user.resetPasswordOTP) {
    throw new apiError(HTTP_STATUS.BAD_REQUEST, "No OTP request found for this email");
  }

  if (user.resetPasswordOTPAttemptCount >= PASSWORD_RESET.MAX_ATTEMPTS) {
    throw new apiError(HTTP_STATUS.TOO_MANY_REQUESTS, "Maximum OTP attempts exceeded. Please request a new OTP.");
  }

  if (!user.resetPasswordOTPExpiresAt || user.resetPasswordOTPExpiresAt < new Date()) {
    throw new apiError(HTTP_STATUS.BAD_REQUEST, "OTP has expired. Please request a new one.");
  }

  const isOtpValid = await bcrypt.compare(otp, user.resetPasswordOTP);

  if (!isOtpValid) {
    user.resetPasswordOTPAttemptCount += 1;
    await user.save({ validateBeforeSave: false });
    throw new apiError(HTTP_STATUS.BAD_REQUEST, "Invalid OTP. Please try again.");
  }

  user.resetPasswordOTP = undefined;
  user.resetPasswordOTPExpiresAt = undefined;
  user.resetPasswordOTPVerified = true;
  user.resetPasswordOTPVerifiedAt = new Date();
  user.resetPasswordOTPAttemptCount = 0;

  await user.save({ validateBeforeSave: false });

  return res
    .status(HTTP_STATUS.OK)
    .json(new apiResponse(HTTP_STATUS.OK, null, "OTP verified successfully. You may reset your password."));
});

const resetForgottenPassword = asyncHandler(async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    throw new apiError(HTTP_STATUS.BAD_REQUEST, "Email and new password are required");
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new apiError(HTTP_STATUS.NOT_FOUND, "No account found with this email");
  }

  if (!user.resetPasswordOTPVerified || !user.resetPasswordOTPVerifiedAt) {
    throw new apiError(HTTP_STATUS.BAD_REQUEST, "OTP verification is required before resetting the password.");
  }

  const verificationWindow = PASSWORD_RESET.OTP_VERIFICATION_WINDOW_MINUTES * 60 * 1000;
  if (Date.now() - user.resetPasswordOTPVerifiedAt.getTime() > verificationWindow) {
    user.resetPasswordOTPVerified = false;
    user.resetPasswordOTPVerifiedAt = undefined;
    await user.save({ validateBeforeSave: false });
    throw new apiError(HTTP_STATUS.BAD_REQUEST, "OTP verification expired. Please request a new OTP.");
  }

  user.password = newPassword;
  user.resetPasswordOTPVerified = false;
  user.resetPasswordOTPVerifiedAt = undefined;
  user.resetPasswordOTPAttemptCount = 0;

  await user.save();

  return res
    .status(HTTP_STATUS.OK)
    .json(new apiResponse(HTTP_STATUS.OK, null, "Password reset successfully."));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId).select("-password -refreshToken");
  return res
    .status(200)
    .json(new apiResponse(200, user, "Current user fetched successfully."));
});

const updateAccountDetails = asyncHandler(async (req, res) => {

  const { username, displayName, email } = req.body;
  const userId = req.user._id;

  if (!username || !displayName || !email) {
    throw new apiError(400, "All fields are required.");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
    _id: { $ne: userId },
  });

  if (existedUser) {
    throw new apiError(409, "User with email or username already exists");
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { username, displayName, email },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new apiResponse(200, updatedUser, "Account details updated successfully."));
});

const updateProfilePicture = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const profilePicLocalPath = req.files?.profilePic?.[0]?.path;

  if (!profilePicLocalPath) {
    throw new apiError(400, "Profile picture is required.");
  }

  const uploadedImage = await uploadOnCloudinary(profilePicLocalPath);

  if (!uploadedImage) {
    throw new apiError(500, "Failed to upload profile picture.");
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { profilePic: uploadedImage.url },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new apiResponse(200, updatedUser, "Profile picture updated successfully."));
})

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken;

  if (!incomingRefreshToken) {
    throw new apiError(401, "Refresh token not found");
  }

  // Verify the refresh token
  let decoded;
  try {
    decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (error) {
    throw new apiError(403, "Invalid refresh token");
  }

  // Only search tokens for this specific user (much more efficient)
  const userTokens = await RefreshToken.find({ 
    user: decoded._id, 
    revoked: false 
  });
  
  if (!userTokens || userTokens.length === 0) {
    throw new apiError(403, "Invalid refresh token");
  }

  let existingToken = null;
  for (const token of userTokens) {
    const isMatch = await bcrypt.compare(incomingRefreshToken, token.token);
    if (isMatch) {
      existingToken = token;
      break;
    }
  }

  if (!existingToken) {
    throw new apiError(403, "Invalid refresh token");
  }

  const user = await User.findById(existingToken.user).select("-password");
  if (!user) {
    throw new apiError(404, "User not found");
  }

  // If token expired
  if (new Date() > existingToken.expiresAt) {
    // Create new refresh token
    const newRefreshToken = generateRefreshToken(user);
    const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);

    // Replace old token
    await RefreshToken.findByIdAndDelete(existingToken._id);
    await RefreshToken.create({
      user: user._id,
      token: hashedRefreshToken,
      expiresAt: new Date(Date.now() + process.env.REFRESH_TOKEN_EXPIRY * 1000),
    });

    const newAccessToken = generateAccessToken(user);

    // Use the same cookie configuration logic as login
    const isProductionBackend = process.env.NODE_ENV === ENVIRONMENTS.PRODUCTION;
    const isCrossOriginDev = isProductionBackend && req.get('Origin')?.includes('localhost');
    
    const cookieConfig = isCrossOriginDev ? {
      secure: false,
      sameSite: "lax"
    } : {
      secure: isProductionBackend,
      sameSite: isProductionBackend ? "none" : "lax"
    };

    res
      .cookie("accessToken", newAccessToken, {
        httpOnly: false, // Allow JavaScript access for socket.io
        secure: cookieConfig.secure,
        sameSite: cookieConfig.sameSite,
        maxAge: TOKEN_EXPIRY.ACCESS_TOKEN,
      })
      .cookie("refreshToken", newRefreshToken, {
        httpOnly: COOKIE_SETTINGS.HTTP_ONLY,
        secure: cookieConfig.secure,
        sameSite: cookieConfig.sameSite,
        maxAge: TOKEN_EXPIRY.REFRESH_TOKEN
      });

    return res.status(200).json(
      new apiResponse(
        200,
        { accessToken: newAccessToken, refreshToken: newRefreshToken },
        "New tokens generated successfully"
      )
    );
  } else {
    // If token NOT expired, only generate new access token
    const newAccessToken = generateAccessToken(user);

    res
      .cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
        maxAge: 30 * 60 * 1000,
      });

    return res.status(200).json(
      new apiResponse(
        200,
        { accessToken: newAccessToken },
        "Access token refreshed successfully"
      )
    );
  }
});

export {
  registerUser,
  loginUser,
  logoutUser,
  getAlluser,
  getOnlineUsers,
  getCurrentUser,
  changeCurrentPassword,
  updateProfilePicture,
  updateAccountDetails,
  refreshAccessToken,
  searchUsers,
  requestPasswordReset,
  verifyPasswordResetOTP,
  resetForgottenPassword
}