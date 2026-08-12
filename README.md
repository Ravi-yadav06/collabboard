# CollabBoard 🎨📹

> **Real-Time Collaborative Whiteboard & Video Calling Application**

CollabBoard is a production-grade full-stack Web application featuring an interactive HTML5 canvas, Socket.IO real-time synchronization, WebRTC video calling, chat, user authentication, and MongoDB persistence.

---

## 🏗️ Architecture & Project Structure

The project follows a clean **MVC (Model-View-Controller)** pattern with modular socket handlers and middleware separation:

```text
collabboard/
├── .env                  # Environment Variables (PORT, MONGODB_URI, JWT_SECRET)
├── .gitignore            # Git exclusion file
├── package.json          # Node dependencies & npm scripts
├── README.md             # Documentation & developer guide
├── server.js             # Express application & HTTP server entry point
├── config/
│   └── db.js             # Database connection & MongoDB Memory Server fallback
├── controllers/
│   ├── authController.js # Logic for User register, login, profile
│   └── boardController.js# Logic for Board create, fetch, details, save
├── middleware/
│   ├── authMiddleware.js # JWT authentication middleware
│   └── errorMiddleware.js# Global 404 and Error handling middleware
├── models/
│   ├── User.js           # Mongoose User Schema
│   └── Board.js          # Mongoose Board Schema
├── routes/
│   ├── authRoutes.js     # Express routes for authentication API
│   └── boardRoutes.js    # Express routes for whiteboard API
├── socket/
│   ├── socketHandler.js  # Main Socket.IO connection & whiteboard sync
│   └── webrtcHandler.js  # WebRTC SDP offer/answer & ICE candidate signaling
├── utils/
│   ├── generateToken.js  # JWT token signing helper
│   └── generateRoomId.js # Room ID generator helper
└── public/               # Client-side static assets
    ├── css/
    │   └── style.css     # Dark glassmorphic design system
    ├── js/
    │   ├── auth.js       # Client authentication & fetch helper
    │   ├── dashboard.js  # Dashboard UI & modal controller
    │   ├── canvas.js     # High-DPI canvas engine (pen, shapes, text, undo/redo)
    │   ├── socket-client.js # Socket.IO client listener & cursor tracker
    │   ├── webrtc.js     # WebRTC peer connection manager & media controls
    │   └── chat.js       # Real-time room chat controller
    ├── index.html        # Landing hero page
    ├── login.html        # Login form
    ├── register.html     # Registration form
    ├── dashboard.html    # User boards dashboard
    └── board.html        # Fullscreen whiteboard workspace
```

---

## ✨ Features

- 🔐 **Authentication**: User registration, login, JWT authorization, bcrypt password hashing.
- 🎨 **Whiteboard Engine**: Pen, Eraser, Line, Rectangle, Circle, Text tool, Color picker, Brush size, Undo/Redo, Clear, and Image Export (PNG).
- ⚡ **Real-Time Collaboration**: Instant Socket.IO stroke broadcasting and live pointer cursor tracking showing user tags.
- 📹 **WebRTC Video Calls**: Mesh topology peer-to-peer video calling with mute/unmute, camera toggle, and leave call options.
- 💬 **Room Chat**: Embedded real-time chat with persistent chat logs.
- 🗄️ **MongoDB Persistence**: Saves room state, drawing data history, and chat messages. Zero-config fallback automatically launches `mongodb-memory-server` if local MongoDB is offline.

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
A default `.env` file is included in the root directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/collabboard
JWT_SECRET=collabboard_super_secret_jwt_key_2026_antigravity
```

### 3. Start Application
```bash
npm start
```

Visit **`http://localhost:5000`** in your browser!
