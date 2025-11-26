import jwt from "jsonwebtoken";

// Validate environment variables
const validateTokenSecrets = () => {
  if (!process.env.ACCESS_TOKEN_SECRET) {
    throw new Error("ACCESS_TOKEN_SECRET environment variable is required");
  }
  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error("REFRESH_TOKEN_SECRET environment variable is required");
  }
};

// Access token generation
export const generateAccessToken = (user) => {
  try {
    validateTokenSecrets();
    const token = jwt.sign(
      {
        _id: user._id,
        username: user.username,
        role: user.role,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "30m" } // Increased to 30m to match constants
    );

    return token;
  } catch (error) {
    console.error("Error generating access token:", error);
    throw new Error("Failed to generate access token");
  }
};

// Refresh token generation
export const generateRefreshToken = (user) => {
  try {
    validateTokenSecrets();
    const token = jwt.sign(
      {
        _id: user._id,
      },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" } // Default to 7d
    );


    return token;
  } catch (error) {
    console.error("Error generating refresh token:", error);
    throw new Error("Failed to generate refresh token");
  }
};

// Token verification utility
export const verifyToken = (token, secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    console.error("Invalid token:", error);
    throw new Error("Invalid token");
  }
};
