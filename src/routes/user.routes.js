import { Router } from "express";
import { 
        registerUser, 
        loginUser,
        refreshAccessToken
    } from "../controllers/user.controller.js";

const router = Router();

router.route("/register").post( registerUser)

router.route("/login").post(loginUser);


router.route("/refresh-token").get(refreshAccessToken)



export default router