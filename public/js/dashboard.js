document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.isLoggedIn()) {
    window.location.href = '/login.html';
    return;
  }

  const user = Auth.getUser();
  if (user) {
    document.getElementById('user-name').textContent = user.username;
    const avatarEl = document.getElementById('user-avatar');
    avatarEl.textContent = user.username.charAt(0).toUpperCase();
    if (user.avatarColor) {
      avatarEl.style.backgroundColor = user.avatarColor;
    }
  }

  // Logout button
  document.getElementById('btn-logout').addEventListener('click', () => {
    Auth.logout();
  });

  // Modal Control
  const createModal = document.getElementById('create-modal');
  const btnOpenModal = document.getElementById('btn-open-create-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCancelModal = document.getElementById('btn-cancel-modal');
  const createForm = document.getElementById('create-board-form');
  const modalAlert = document.getElementById('modal-alert');

  const openModal = () => {
    modalAlert.style.display = 'none';
    createModal.classList.add('active');
    document.getElementById('board-name').focus();
  };

  const closeModal = () => {
    createModal.classList.remove('active');
    createForm.reset();
  };

  btnOpenModal.addEventListener('click', openModal);
  btnCloseModal.addEventListener('click', closeModal);
  btnCancelModal.addEventListener('click', closeModal);

  // Handle Board Creation
  createForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    modalAlert.style.display = 'none';
    const name = document.getElementById('board-name').value.trim();

    try {
      const data = await Auth.fetchWithAuth('/api/boards/create', {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      closeModal();
      window.location.href = `/board.html?id=${data.board.roomId}`;
    } catch (err) {
      modalAlert.textContent = err.message || 'Failed to create board.';
      modalAlert.style.display = 'block';
    }
  });

  // Handle Join Room Form
  const joinForm = document.getElementById('join-room-form');
  joinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const roomId = document.getElementById('join-room-input').value.trim();
    if (!roomId) return;
    window.location.href = `/board.html?id=${roomId}`;
  });

  // Load User Boards Grid
  const loadBoards = async () => {
    const grid = document.getElementById('rooms-grid');
    try {
      const data = await Auth.fetchWithAuth('/api/boards');
      const boards = data.boards;

      if (!boards || boards.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 60px 0; color: var(--text-muted);">
            <i class="fa-regular fa-folder-open" style="font-size: 3rem; margin-bottom: 12px; opacity: 0.5;"></i>
            <p style="font-size: 1.1rem; color: var(--text-secondary);">No whiteboard rooms found.</p>
            <p style="font-size: 0.875rem;">Create a new board above to start collaborating!</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = boards.map(board => {
        const isOwner = board.owner && (board.owner._id === user._id || board.owner.username === user.username);
        const createdDate = new Date(board.createdAt).toLocaleDateString(undefined, {
          month: 'short', day: 'numeric', year: 'numeric'
        });

        return `
          <div class="glass-panel room-card" onclick="window.location.href='/board.html?id=${board.roomId}'">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <h3>${escapeHtml(board.name)}</h3>
              <span class="room-id-pill" onclick="event.stopPropagation(); navigator.clipboard.writeText('${board.roomId}'); alert('Copied Room ID!');">
                <i class="fa-solid fa-copy"></i> ${board.roomId}
              </span>
            </div>
            <p>${isOwner ? 'Created by you' : `Owner: ${escapeHtml(board.owner?.username || 'Unknown')}`}</p>
            <div class="room-meta">
              <span><i class="fa-regular fa-calendar"></i> ${createdDate}</span>
              <span style="color: var(--accent-cyan); font-weight: 500;">
                Open <i class="fa-solid fa-arrow-right"></i>
              </span>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #f87171;">
          <p>Failed to load boards: ${err.message}</p>
        </div>
      `;
    }
  };

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  loadBoards();
});
