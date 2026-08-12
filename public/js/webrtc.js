const WebRTCManager = (() => {
  let localStream = null;
  let currentRoomId = null;
  let currentUser = null;
  let isInCall = false;

  let audioEnabled = true;
  let videoEnabled = true;

  // Peer Connections map: socketId -> RTCPeerConnection
  const peerConnections = new Map();
  // Remote Streams map: socketId -> MediaStream
  const remoteStreams = new Map();

  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  function init(roomId, user) {
    currentRoomId = roomId;
    currentUser = user;

    setupUIEventListeners();
    setupSocketListeners();
  }

  function setupUIEventListeners() {
    const btnToggleVideo = document.getElementById('btn-toggle-video');
    const btnToggleMic = document.getElementById('btn-toggle-mic');
    const btnToggleCam = document.getElementById('btn-toggle-cam');
    const btnLeaveCall = document.getElementById('btn-leave-call');

    btnToggleVideo?.addEventListener('click', () => {
      if (!isInCall) {
        startCall();
      } else {
        leaveCall();
      }
    });

    btnToggleMic?.addEventListener('click', toggleAudio);
    btnToggleCam?.addEventListener('click', toggleVideo);
    btnLeaveCall?.addEventListener('click', leaveCall);
  }

  async function startCall() {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      const localVideo = document.getElementById('local-video');
      if (localVideo) {
        localVideo.srcObject = localStream;
      }

      isInCall = true;
      document.getElementById('video-overlay-grid').style.display = 'flex';
      document.getElementById('video-controls-bar').style.display = 'flex';

      const socket = SocketClient.getSocket();
      if (socket) {
        // Inform other members in the room that we initiated/joined video call
        socket.emit('user-joined-video-call', { roomId: currentRoomId });
      }
    } catch (err) {
      console.error('Error accessing camera/microphone:', err);
      alert('Unable to access camera or microphone for video call.');
    }
  }

  function setupSocketListeners() {
    // Rely on SocketClient's socket instance
    const checkSocketInterval = setInterval(() => {
      const socket = SocketClient.getSocket();
      if (!socket) return;
      clearInterval(checkSocketInterval);

      // Handle peer joining room while call is active
      socket.on('user-joined', async ({ user }) => {
        if (isInCall && user.socketId !== socket.id) {
          createPeerConnection(user.socketId, user, true);
        }
      });

      socket.on('webrtc-offer', async ({ callerSocketId, offer, user }) => {
        if (!isInCall) {
          // Auto start call on receiving call invitation/offer
          await startCall();
        }
        const pc = createPeerConnection(callerSocketId, user, false);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc-answer', {
          targetSocketId: callerSocketId,
          answer
        });
      });

      socket.on('webrtc-answer', async ({ responderSocketId, answer }) => {
        const pc = peerConnections.get(responderSocketId);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      });

      socket.on('webrtc-ice-candidate', async ({ senderSocketId, candidate }) => {
        const pc = peerConnections.get(senderSocketId);
        if (pc && candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error('Error adding ICE candidate:', e);
          }
        }
      });

      socket.on('webrtc-peer-left', ({ socketId }) => {
        removePeer(socketId);
      });
    }, 200);
  }

  function createPeerConnection(targetSocketId, targetUser, isInitiator) {
    if (peerConnections.has(targetSocketId)) {
      return peerConnections.get(targetSocketId);
    }

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnections.set(targetSocketId, pc);

    // Add local stream tracks to PeerConnection
    if (localStream) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    // Handle incoming remote media tracks
    pc.ontrack = (event) => {
      let stream = remoteStreams.get(targetSocketId);
      if (!stream) {
        stream = new MediaStream();
        remoteStreams.set(targetSocketId, stream);
      }
      stream.addTrack(event.track);
      createOrUpdateRemoteVideoTile(targetSocketId, targetUser, stream);
    };

    // ICE Candidates forwarding
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = SocketClient.getSocket();
        socket.emit('webrtc-ice-candidate', {
          targetSocketId,
          candidate: event.candidate
        });
      }
    };

    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          const socket = SocketClient.getSocket();
          socket.emit('webrtc-offer', {
            targetSocketId,
            offer
          });
        } catch (e) {
          console.error('Error creating offer:', e);
        }
      };
    }

    return pc;
  }

  function createOrUpdateRemoteVideoTile(socketId, user, stream) {
    const grid = document.getElementById('video-overlay-grid');
    let tile = document.getElementById(`video-tile-${socketId}`);

    if (!tile) {
      tile = document.createElement('div');
      tile.className = 'video-tile';
      tile.id = `video-tile-${socketId}`;
      tile.innerHTML = `
        <video id="video-remote-${socketId}" autoplay playsinline></video>
        <div class="video-tile-name">${user ? escapeHtml(user.username) : 'Peer'}</div>
      `;
      grid.appendChild(tile);
    }

    const videoEl = document.getElementById(`video-remote-${socketId}`);
    if (videoEl) {
      videoEl.srcObject = stream;
    }
  }

  function removePeer(socketId) {
    const pc = peerConnections.get(socketId);
    if (pc) {
      pc.close();
      peerConnections.delete(socketId);
    }
    remoteStreams.delete(socketId);

    const tile = document.getElementById(`video-tile-${socketId}`);
    if (tile && tile.parentNode) {
      tile.parentNode.removeChild(tile);
    }
  }

  function toggleAudio() {
    if (!localStream) return;
    audioEnabled = !audioEnabled;
    localStream.getAudioTracks().forEach(track => track.enabled = audioEnabled);

    const btn = document.getElementById('btn-toggle-mic');
    btn.innerHTML = audioEnabled ? '<i class="fa-solid fa-microphone"></i>' : '<i class="fa-solid fa-microphone-slash" style="color:#f87171;"></i>';
  }

  function toggleVideo() {
    if (!localStream) return;
    videoEnabled = !videoEnabled;
    localStream.getVideoTracks().forEach(track => track.enabled = videoEnabled);

    const btn = document.getElementById('btn-toggle-cam');
    btn.innerHTML = videoEnabled ? '<i class="fa-solid fa-video"></i>' : '<i class="fa-solid fa-video-slash" style="color:#f87171;"></i>';
  }

  function leaveCall() {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
    }

    peerConnections.forEach(pc => pc.close());
    peerConnections.clear();
    remoteStreams.clear();

    document.getElementById('video-overlay-grid').style.display = 'none';
    document.getElementById('video-controls-bar').style.display = 'none';

    // Remove remote video tiles except local
    const grid = document.getElementById('video-overlay-grid');
    Array.from(grid.children).forEach(child => {
      if (child.id !== 'local-video-tile') {
        grid.removeChild(child);
      }
    });

    isInCall = false;
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return {
    init
  };
})();
