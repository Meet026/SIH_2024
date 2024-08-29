import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"


const generateAccessAndrefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        console.log("access",accessToken, "refresh",refreshToken);
        return {accessToken, refreshToken}


    } catch (error) {
        return res.status(500).json(
            new ApiResponse(400, "Something went wrong while generating referesh and access token")
        )
    }
}

const registerUser = asyncHandler( async (req, res) => {
    const { email, username, password } = req.body

    if([email, username, password].some((field) => field?.trim()=== "")){
        return res.status(400).send("All fields are required")
        
    }

    const existedUser = await User.findOne({
        $or: [{ username } , { email }]
    })

    if(existedUser){
        res.redirect('/login');
    }

     const user = await User.create({
        email,
        password,
        username
    })

     const createdUser = await User.findById(user._id).select(
        "-password -refreshToken" //those two field are not selected when we get response back
     )

     if(!createdUser){
        return res.status(400).json(
            new ApiResponse(400, "something went wrong while registering the user")
        )
     }

     return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
     )
}) 

const loginUser = asyncHandler(async (req, res) => {
    const {email, password} = req.body

    console.log(email, password);
    // if(!(email || password)){
    //     return res.status(400).json(
    //         new ApiResponse(400, "username and password is required")
    //     )
    // }


    const user = await User.findOne({
        $or : [{ email }]
    })

    // if(!user){
    //     return res.status(400).json(
    //         new ApiResponse(400, "user with this email doesn't exist")
    //     )
    // }

    const isPasswordValid = await user.isPasswordCorrect(password)

    // if(!isPasswordValid){
    //     return res.status(500).json(
    //         new ApiResponse(400, "password is incorrect")
    //     )
    // }

    const {accessToken, refreshToken} = await generateAccessAndrefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password")

    const option = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            }, "user loggedIn successfully  "
        )
    )
})



const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefresshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefresshToken){
        return res.status(400).json(
            new ApiResponse(400, "Unauthorized request")
        )
    }

    try {
        const dekodedToken = jwt.verify(
            incomingRefresshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(dekodedToken?._id)
    
        if(!user){
            return res.status(400).json(
                new ApiResponse(400, "Invalid request Token")
            )
        }
    
        if(incomingRefresshToken !== user?.refreshToken){
            return res.status(400).json(
                new ApiResponse(400, "refreshToken if Expired or used")
            )
        }
    
        const option = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, refreshToken} = await generateAccessAndrefreshToken(user._id)
    
        return res.status(200)
        .cookie("accessToken", accessToken)
        .cookie("refreshToken", refreshToken)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken, refreshToken
                },
                "Access token refreshed"
            )
        )
    } catch (error) {
        return res.status(400).json(
            new ApiResponse(400, "invalid request token")
        )
    }
})




export {
    registerUser,
    loginUser,
    refreshAccessToken,
}


    