import jwt from "jsonwebtoken";

// Access token generation
export const generateAccessToken = (user) => {
  try {
    const token = jwt.sign(
      {
        _id: user._id,
        username: user.username,
        role: user.role,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m" } // Default to 15m
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
