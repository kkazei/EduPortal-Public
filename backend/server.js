import express from "express";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes.js";
import classRoutes from "./routes/class.routes.js";
import studentRoutes from "./routes/student.routes.js";
import announcementRoutes from "./routes/announcement.routes.js";
import gradeRoutes from './routes/grade.routes.js';
import subjectRoutes from "./routes/subject.routes.js"; 
import attendanceRoutes from "./routes/attendance.routes.js"; 
import adminRoutes from './routes/admin.routes.js';
import pushRoutes from './routes/push.routes.js'; 
import commentRoutes from './routes/comment.routes.js';
import analyticsRoutes from './routes/analytics.routes.js'; 
import auditRoutes from './routes/audit.routes.js';
import superadminRoutes from './routes/superadmin.routes.js';
import schoolYearRoutes from './routes/schoolYear.routes.js';
import visitRoutes from './routes/visit.routes.js';
import { sequelize } from './models/index.js'; // Import sequelize instead of Sequelize
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { connectDb, initializeDb } from "./db/dbConfig.js";
import { scheduleUserPurge } from './utils/cleanup.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const __dirname = path.resolve();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Add this line with your other middleware
app.use('/uploads', express.static('uploads'));

// API Routes
app.use("/api/auth", authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/analytics', analyticsRoutes); 
app.use('/api/school-years', schoolYearRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/superadmin', superadminRoutes);

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Server is running' });
});
  
if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "/frontend/dist")));

    app.get("*", (req, res) => {
        res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: "Server Error" });
});

// Start server with async initialization
const startServer = async () => {
    try {
        await connectDb();
        
        // Use initializeDb to sync models and seed data if needed
        // Use { alter: true } to apply changes to existing tables
        await initializeDb({ alter: true });
        // Schedule daily cleanup of users deleted > 7 days
        scheduleUserPurge();
        
        app.listen(PORT, () => {
            if (process.env.NODE_ENV !== 'production') {
                console.log(`✅ Server is running at http://localhost:${PORT}`);
            }
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();