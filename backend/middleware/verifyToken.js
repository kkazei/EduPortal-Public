import jwt from 'jsonwebtoken';
import User from '../models/user.model.js'; // Import User model
import { logEvent } from './auditLogger.js';

export const verifyToken = async (req, res, next) => {
    // Support both standard admin/teacher token and a dedicated superadmin token
    const token = req.cookies.token || req.cookies.super_token;
    if(!token) return res.status(401).json({success:false, message:"Unauthorized"});
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if(!decoded) return res.status(401).json({success:false, message:"Invalid Token"});
        
    // Fetch full user data from database
    const user = await User.findByPk(decoded.userId);
        if(!user) return res.status(401).json({success:false, message:"User not found"});
    if (user.is_deleted) return res.status(403).json({ success:false, message:"Account is disabled" });
        
        if (process.env.NODE_ENV !== 'production') {
            console.log("User data from database:", user.toJSON());
        }
        
        // Attach complete user info to request
        req.userId = decoded.userId;
        req.user = {
            id: user.id,
            email: user.user_email,
            fullname: user.user_fullname,
            role: user.user_role // This sets the role from the database
        };
        
        if (process.env.NODE_ENV !== 'production') {
            console.log("Setting req.user to:", req.user);
        }

    // Log authenticated request (generic) - but skip audit log endpoints to avoid self-logging
    try {
        const path = req.originalUrl || '';
        const isAuditRoute = /^\/api\/audit-logs(\/|$)/.test(path);
        if (!isAuditRoute) {
            await logEvent({ req });
        }
    } catch (_) {}

        next();
    } catch (error) {
        const jwtErrorNames = new Set([
            'TokenExpiredError',
            'JsonWebTokenError',
            'NotBeforeError',
        ]);

        if (jwtErrorNames.has(error?.name)) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        console.error("Error verifying token", error);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};