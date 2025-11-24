import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    console.log("🔐 Auth middleware: Verifying JWT token...");
    
    // Extract token from Authorization header or cookies
    const token = req.header("Authorization")?.replace("Bearer ", "") || req.cookies?.accessToken;

    if (!token) {
      console.log("❌ Auth middleware: No token provided");
      throw new apiError(401, "Unauthorized request. Access token is missing.");
    }

    console.log("🔍 Auth middleware: Token found, verifying...");

    // Verify the token
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    console.log(`✅ Auth middleware: Token verified for user ID: ${decodedToken?._id}`);

    // Find the user associated with the token
    const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

    if (!user) {
      console.log(`❌ Auth middleware: User not found for ID: ${decodedToken?._id}`);
      throw new apiError(401, "Invalid access token. User not found.");
    }

    console.log(`✅ Auth middleware: User authenticated - ${user.username || user.email}`);
    
    // Attach user to the request object
    req.user = user;
    next();
  } catch (error) {
    console.log(`❌ Auth middleware: JWT verification failed - ${error?.message}`);
    // JWT verification error
    throw new apiError(401, error?.message || "Invalid access token.");
  }
});