import { Router } from "express";
import { 
        registerUser, 
        loginUser,
        refreshAccessToken,
        logoutUser,
        changeCurrentPassword
    } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post( registerUser)

router.route("/login").post(loginUser);

router.route("/refresh-token").get(refreshAccessToken);

router.route("/change-password").post(verifyJWT, changeCurrentPassword);

router.route("/logout").post(verifyJWT,  logoutUser)



export default router