const express = require('express');
const router = express.Router();
const {
  createBoard,
  getBoards,
  getBoardByRoomId,
  saveBoardState
} = require('../controllers/boardController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/create', authMiddleware, createBoard);
router.get('/', authMiddleware, getBoards);
router.get('/:roomId', authMiddleware, getBoardByRoomId);
router.put('/:roomId/save', authMiddleware, saveBoardState);

module.exports = router;
