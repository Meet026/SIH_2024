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
        return res.status(400).json(
            new ApiResponse(400, "all field are required")
        )
    }

    const existedUser = await User.findOne({
        $or: [{ username } , { email }]
    })

    if(existedUser){
        return res.status(400).json(
            new ApiResponse(400, "user with username or email already exist")
        )
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
    if(!(email || password)){
        return res.status(400).json(
            new ApiResponse(400, "username and password is required")
        )
    }


    const user = await User.findOne({
        $or : [{ email }]
    })

    if(!user){
        return res.status(400).json(
            new ApiResponse(400, "user with this email doesn't exist")
        )
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        return res.status(500).json(
            new ApiResponse(400, "password is incorrect")
        )
    }

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

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
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

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body

    

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiResponse(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})


const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
})




export {
    registerUser,
    loginUser,
    refreshAccessToken,
    changeCurrentPassword,
    logoutUser
}


    