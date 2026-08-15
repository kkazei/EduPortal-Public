# EduPortal - School Management System

## Overview
EduPortal is a comprehensive school management system designed to streamline educational workflows. It brings together administration, teachers, students, and parents on a single platform to enhance communication and educational processes.

## Features

### For Administrators
- User management (students, teacher)
- Class and section management
- Announcement creation and distribution
- School-wide data monitoring and reporting

### For Teachers
- Student attendance tracking
- Grade management
- Generate and print student report cards
- Create and manage class announcements

### For Students
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

### Frontend
- React with Vite
- Tailwind CSS for styling
- Progressive Web App (PWA) capabilities

### Backend
- Node.js
- Express.js
- RESTful API architecture
- Web Push notifications

### Database
- SQL database for data storage and retrieval

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

### Backend Setup
```bash
# Clone the repository
git clone <repository-url>

# Navigate to backend directory
cd EduPortal/backend

# Install dependencies
npm install

# Create .env file with required environment variables
# (Database connection, JWT secret, VAPID keys)

# Start the server
npm start
```

### Frontend Setup
```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

## Usage

After setting up both frontend and backend, navigate to `http://localhost:5173` in your browser to access the application.

## Logging Controls

- `NODE_ENV=production`: Disables verbose logs by default (including Sequelize SQL output and most console logs).
- `DB_LOG_QUERIES=true|false`: Force-enable or disable SQL query logging regardless of `NODE_ENV`.
- In production, authentication debug logs are suppressed; in development they remain for easier debugging.


## License

MIT License

## Contributors

- Jirro Aeron Guiao - Initial work and development




