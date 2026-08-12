const registerWebRTCHandlers = (io, socket) => {
  // Relay offer SDP to target peer
  socket.on('webrtc-offer', ({ targetSocketId, offer }) => {
    io.to(targetSocketId).emit('webrtc-offer', {
      callerSocketId: socket.id,
      offer,
      user: socket.userData
    });
  });

  // Relay answer SDP to target peer
  socket.on('webrtc-answer', ({ targetSocketId, answer }) => {
    io.to(targetSocketId).emit('webrtc-answer', {
      responderSocketId: socket.id,
      answer
    });
  });

  // Relay ICE Candidate to target peer
  socket.on('webrtc-ice-candidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('webrtc-ice-candidate', {
      senderSocketId: socket.id,
      candidate
    });
  });

  // Relay peer mic/cam state toggle
  socket.on('webrtc-toggle-media', ({ roomId, audioEnabled, videoEnabled }) => {
    if (!roomId) return;
    socket.to(roomId).emit('webrtc-peer-media-state', {
      socketId: socket.id,
      audioEnabled,
      videoEnabled
    });
  });
};

module.exports = registerWebRTCHandlers;
