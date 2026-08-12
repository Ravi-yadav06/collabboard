const SocketClient = (() => {
  let socket = null;
  let currentRoomId = null;
  let currentUser = null;
  const remoteCursors = new Map(); // socketId -> DOM Element

  function init(roomId, user) {
    currentRoomId = roomId;
    currentUser = user;

    socket = io();

    socket.on('connect', () => {
      console.log('⚡ Socket connected to server with ID:', socket.id);
      socket.emit('join-room', { roomId: currentRoomId, user: currentUser });
    });

    // Whiteboard Sync Handlers
    socket.on('draw-action', (action) => {
      CanvasEngine.handleRemoteDrawAction(action);
    });

    socket.on('canvas-clear', () => {
      CanvasEngine.clearCanvas(false);
    });

    socket.on('canvas-restore', (drawData) => {
      CanvasEngine.restoreCanvasState(drawData);
    });

    // Live Cursor Tracking Handler
    socket.on('cursor-move', (data) => {
      updateRemoteCursor(data);
    });

    // Room Participants List Handler
    socket.on('room-participants', (participants) => {
      renderParticipants(participants);
    });

    // Clean up cursor on user disconnect
    socket.on('user-left', ({ socketId }) => {
      removeRemoteCursor(socketId);
    });
  }

  function sendDrawAction(action) {
    if (!socket || !currentRoomId) return;
    socket.emit('draw-action', { roomId: currentRoomId, action });
  }

  function sendClearCanvas() {
    if (!socket || !currentRoomId) return;
    socket.emit('canvas-clear', { roomId: currentRoomId });
  }

  function sendCanvasRestore(drawData) {
    if (!socket || !currentRoomId) return;
    socket.emit('canvas-restore', { roomId: currentRoomId, drawData });
  }

  function sendCursorMove(x, y) {
    if (!socket || !currentRoomId) return;
    socket.emit('cursor-move', { roomId: currentRoomId, x, y });
  }

  function updateRemoteCursor(data) {
    const layer = document.getElementById('cursors-layer');
    if (!layer) return;

    let cursorEl = remoteCursors.get(data.socketId);
    if (!cursorEl) {
      cursorEl = document.createElement('div');
      cursorEl.className = 'remote-cursor';
      cursorEl.innerHTML = `
        <div class="cursor-pointer" style="border-color: ${data.avatarColor || '#8b5cf6'}"></div>
        <div class="cursor-label" style="background-color: ${data.avatarColor || '#8b5cf6'}">${escapeHtml(data.username)}</div>
      `;
      layer.appendChild(cursorEl);
      remoteCursors.set(data.socketId, cursorEl);
    }

    cursorEl.style.transform = `translate(${data.x}px, ${data.y}px)`;
  }

  function removeRemoteCursor(socketId) {
    const cursorEl = remoteCursors.get(socketId);
    if (cursorEl && cursorEl.parentNode) {
      cursorEl.parentNode.removeChild(cursorEl);
    }
    remoteCursors.delete(socketId);
  }

  function renderParticipants(participants) {
    const countEl = document.getElementById('user-count');
    if (countEl) countEl.textContent = participants.length;

    const listEl = document.getElementById('participants-list');
    if (!listEl) return;

    listEl.innerHTML = participants.map(p => `
      <div class="participant-item">
        <div class="avatar-circle" style="background-color: ${p.avatarColor || '#8b5cf6'}; width: 32px; height: 32px; font-size: 0.8rem;">
          ${escapeHtml(p.username.charAt(0).toUpperCase())}
        </div>
        <div class="participant-info">
          <div class="participant-name">
            ${escapeHtml(p.username)} ${p.id === currentUser._id ? '(You)' : ''}
          </div>
        </div>
        <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span>
      </div>
    `).join('');
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return {
    init,
    getSocket: () => socket,
    sendDrawAction,
    sendClearCanvas,
    sendCanvasRestore,
    sendCursorMove
  };
})();
