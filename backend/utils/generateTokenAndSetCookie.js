import jwt from "jsonwebtoken";

export const generateTokenAndSetCookie = (res, userId) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
    
    // Update cookie settings to work in development
    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Only use HTTPS in production 
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // Important for local dev
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/',
    });
    
    return token;
};
