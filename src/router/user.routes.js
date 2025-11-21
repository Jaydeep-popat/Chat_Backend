import { Router } from "express";
import { loginUser, registerUser,logoutUser,getAlluser,getOnlineUsers,getCurrentUser,updateProfilePicture,updateAccountDetails,refreshAccessToken,changeCurrentPassword,searchUsers,requestPasswordReset,verifyPasswordResetOTP,resetForgottenPassword } from "../controllers/auth.controller.js"
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validateRegister, validateLogin, validateUpdateAccount, validateChangePassword, validateForgotPasswordRequest, validateVerifyPasswordResetOTP, validateResetForgottenPassword } from "../middlewares/validation.middleware.js";
import { authLimiter, uploadLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = new Router();

router.route("/register").post(
    authLimiter,
    upload.fields([{name:"profilePic",maxCount:1}]),
    validateRegister,
    registerUser
);

router.route("/login").post(authLimiter, validateLogin, loginUser);

router.route("/forgot-password/request").post(
    authLimiter,
    validateForgotPasswordRequest,
    requestPasswordReset
);

router.route("/forgot-password/verify").post(
    authLimiter,
    validateVerifyPasswordResetOTP,
    verifyPasswordResetOTP
);

router.route("/forgot-password/reset").post(
    authLimiter,
    validateResetForgottenPassword,
    resetForgottenPassword
);

router.route("/logout").post(verifyJWT,logoutUser);

router.route("/getAlluser").get(verifyJWT,getAlluser);

router.route("/getOnlineUsers").post(verifyJWT,getOnlineUsers);

router.route("/getCurrentUser").get(verifyJWT,getCurrentUser);

router.route("/updateProfilePicture").post(
    verifyJWT,
    uploadLimiter,
    upload.fields([{name:"profilePic",maxCount:1}]),
    updateProfilePicture
);

router.route("/updateAccountDetails").post(
    verifyJWT,
    validateUpdateAccount,
    updateAccountDetails
);

router.route("/refresh-token").post(authLimiter, refreshAccessToken);

router.route("/change-password").post(
    verifyJWT,
    validateChangePassword,
    changeCurrentPassword
);

router.route("/search").get(
    verifyJWT,
    searchUsers
);

export default router