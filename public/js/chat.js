const ChatController = (() => {
  let currentUser = null;

  function init(initialMessages = []) {
    currentUser = Auth.getUser();

    renderInitialMessages(initialMessages);
    setupEventListeners();
    setupSocketListener();
  }

  function setupEventListeners() {
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;

      const socket = SocketClient.getSocket();
      if (socket) {
        socket.emit('send-message', {
          roomId: new URLSearchParams(window.location.search).get('id'),
          text
        });
      }

      input.value = '';
    });
  }

  function setupSocketListener() {
    const checkSocketInterval = setInterval(() => {
      const socket = SocketClient.getSocket();
      if (!socket) return;
      clearInterval(checkSocketInterval);

      socket.on('chat-message', (msg) => {
        appendMessage(msg);
      });
    }, 200);
  }

  function renderInitialMessages(messages) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    container.innerHTML = '';
    messages.forEach(msg => appendMessage(msg));
  }

  function appendMessage(msg) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const isSelf = currentUser && (msg.senderId === currentUser._id || msg.sender === currentUser.username);
    const dateStr = new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg ${isSelf ? 'self' : 'other'}`;
    msgDiv.innerHTML = `
      ${!isSelf ? `<span class="msg-sender" style="color: ${msg.color || '#8b5cf6'}">${escapeHtml(msg.sender)}</span>` : ''}
      <div class="msg-bubble">${escapeHtml(msg.text)}</div>
      <span class="msg-time">${dateStr}</span>
    `;

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return {
    init,
    appendMessage
  };
})();
