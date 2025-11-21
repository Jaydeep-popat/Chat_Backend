import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    // Extract token from Authorization header or cookies
    const token = req.header("Authorization")?.replace("Bearer ", "") || req.cookies?.accessToken;

    if (!token) {
      throw new apiError(401, "Unauthorized request. Access token is missing.");
    }

    // Verify the token
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // Find the user associated with the token
    const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

    if (!user) {
      throw new apiError(401, "Invalid access token. User not found.");
    }

    // Attach user to the request object
    req.user = user;
    next();
  } catch (error) {
    console.error("JWT Verification Error:", error.message);
    throw new apiError(401, error?.message || "Invalid access token.");
  }
});