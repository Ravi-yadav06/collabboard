const Board = require('../models/Board');
const registerWebRTCHandlers = require('./webrtcHandler');

// Active users per room map: roomId -> Map<socketId, userData>
const roomParticipants = new Map();

const initSocketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join room
    socket.on('join-room', ({ roomId, user }) => {
      if (!roomId || !user) return;

      socket.roomId = roomId;
      socket.userData = {
        socketId: socket.id,
        id: user._id || user.id,
        username: user.username || 'Anonymous',
        avatarColor: user.avatarColor || '#8b5cf6'
      };

      socket.join(roomId);

      if (!roomParticipants.has(roomId)) {
        roomParticipants.set(roomId, new Map());
      }
      roomParticipants.get(roomId).set(socket.id, socket.userData);

      const participantsList = Array.from(roomParticipants.get(roomId).values());

      // Broadcast participant list update
      io.in(roomId).emit('room-participants', participantsList);

      // Notify room members
      socket.to(roomId).emit('user-joined', {
        user: socket.userData,
        participants: participantsList
      });

      console.log(`👤 ${socket.userData.username} joined room: ${roomId} (Total: ${participantsList.length})`);
    });

    // Whiteboard Sync Events
    socket.on('draw-action', ({ roomId, action }) => {
      if (!roomId) return;
      socket.to(roomId).emit('draw-action', action);
    });

    socket.on('canvas-clear', ({ roomId }) => {
      if (!roomId) return;
      socket.to(roomId).emit('canvas-clear');
    });

    socket.on('canvas-restore', ({ roomId, drawData }) => {
      if (!roomId) return;
      socket.to(roomId).emit('canvas-restore', drawData);
    });

    // Live Cursor Pointer Position Sync
    socket.on('cursor-move', ({ roomId, x, y }) => {
      if (!roomId || !socket.userData) return;
      socket.to(roomId).emit('cursor-move', {
        socketId: socket.id,
        username: socket.userData.username,
        avatarColor: socket.userData.avatarColor,
        x,
        y
      });
    });

    // Real-Time Room Chat
    socket.on('send-message', async ({ roomId, text }) => {
      if (!roomId || !text || !socket.userData) return;

      const messageObj = {
        sender: socket.userData.username,
        senderId: socket.userData.id,
        color: socket.userData.avatarColor,
        text: text.trim(),
        timestamp: new Date()
      };

      io.in(roomId).emit('chat-message', messageObj);

      try {
        await Board.findOneAndUpdate(
          { roomId },
          { $push: { chatMessages: messageObj } }
        );
      } catch (err) {
        console.error('Error saving chat message:', err);
      }
    });

    // Register WebRTC Video Signaling Handlers
    registerWebRTCHandlers(io, socket);

    // Disconnect Handler
    socket.on('disconnect', () => {
      const roomId = socket.roomId;
      if (roomId && roomParticipants.has(roomId)) {
        const roomMap = roomParticipants.get(roomId);
        const user = roomMap.get(socket.id);
        roomMap.delete(socket.id);

        if (roomMap.size === 0) {
          roomParticipants.delete(roomId);
        } else {
          const updatedList = Array.from(roomMap.values());
          io.in(roomId).emit('room-participants', updatedList);
          socket.to(roomId).emit('user-left', {
            socketId: socket.id,
            user,
            participants: updatedList
          });
        }

        socket.to(roomId).emit('webrtc-peer-left', { socketId: socket.id });

        if (user) {
          console.log(`🚪 ${user.username} left room: ${roomId}`);
        }
      }
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
};

module.exports = initSocketHandler;
