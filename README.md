# EduPortal - Student Records Management System

A web-based student records management system built for **Tapinac Special Science Elementary School**, developed to replace manual academic record-keeping with a centralized digital platform.

## About

EduPortal was built to address the challenges of manual academic record management — particularly around student grades, attendance, report cards, certificates, and school announcements. It brings administrators, teachers, students, and parents/guardians onto a single platform with role-based access, cutting down on paperwork and making academic records easier to access and manage for everyone involved.

## Features

### For Administrators
- User management (students, teachers)
- Class and section management
- Announcement creation and distribution
- School-wide data monitoring and reporting

### For Teachers
- Student attendance tracking
- Grade management
- Generate and print student report cards
- Create and manage class announcements

### For Students / Parents & Guardians
- View grades and report cards
- Access class announcements
- Track attendance records
- View personal academic progress

### General Features
- Responsive design for desktop and mobile devices
- Role-based access control
- Push notifications for important updates
- Installable as a PWA (Progressive Web App)

## Technology Stack

**Frontend**
- React with Vite
- Tailwind CSS
- Progressive Web App (PWA) capabilities

**Backend**
- Node.js
- Express.js
- RESTful API architecture
- Web Push notifications

**Database**
- SQL (via Sequelize ORM)

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

### Backend Setup
```bash
git clone <repository-url>
cd EduPortal/backend
npm install
# Create a .env file with required environment variables
# (Database connection, JWT secret, VAPID keys)
npm start
```

### Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```

### Usage
After setting up both frontend and backend, navigate to `http://localhost:5173` in your browser.

## Logging Controls
- `NODE_ENV=production`: Disables verbose logs by default (including Sequelize SQL output and most console logs).
- `DB_LOG_QUERIES=true|false`: Force-enable or disable SQL query logging regardless of `NODE_ENV`.
- In production, authentication debug logs are suppressed; in development they remain for easier debugging.

## License
MIT License

## Author
Jirro Aeron Guiao
