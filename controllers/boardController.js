const Board = require('../models/Board');
const generateRoomId = require('../utils/generateRoomId');

// @desc    Create a new whiteboard room
// @route   POST /api/boards/create
// @access  Private
const createBoard = async (req, res, next) => {
  try {
    const { name } = req.body;
    const roomId = generateRoomId();

    const newBoard = new Board({
      roomId,
      name: name || 'Collaborative Board',
      owner: req.user._id,
      collaborators: [req.user._id],
      drawData: [],
      chatMessages: []
    });

    await newBoard.save();
    await newBoard.populate('owner', 'username avatarColor email');

    res.status(201).json({
      message: 'Board created successfully',
      board: newBoard
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all boards created by or shared with current user
// @route   GET /api/boards
// @access  Private
const getBoards = async (req, res, next) => {
  try {
    const boards = await Board.find({
      $or: [
        { owner: req.user._id },
        { collaborators: req.user._id }
      ]
    })
      .sort({ updatedAt: -1 })
      .populate('owner', 'username avatarColor email')
      .populate('collaborators', 'username avatarColor email');

    res.json({ boards });
  } catch (error) {
    next(error);
  }
};

// @desc    Get room details by roomId
// @route   GET /api/boards/:roomId
// @access  Private
const getBoardByRoomId = async (req, res, next) => {
  try {
    let board = await Board.findOne({ roomId: req.params.roomId })
      .populate('owner', 'username avatarColor email')
      .populate('collaborators', 'username avatarColor email');

    if (!board) {
      res.status(404);
      throw new Error('Whiteboard room not found.');
    }

    const isCollaborator = board.collaborators.some(
      (collab) => collab._id.toString() === req.user._id.toString()
    );

    if (!isCollaborator) {
      board.collaborators.push(req.user._id);
      await board.save();
      await board.populate('collaborators', 'username avatarColor email');
    }

    res.json({ board });
  } catch (error) {
    next(error);
  }
};

// @desc    Save/update canvas draw data
// @route   PUT /api/boards/:roomId/save
// @access  Private
const saveBoardState = async (req, res, next) => {
  try {
    const { drawData } = req.body;

    const board = await Board.findOneAndUpdate(
      { roomId: req.params.roomId },
      { $set: { drawData: drawData || [], updatedAt: Date.now() } },
      { new: true }
    );

    if (!board) {
      res.status(404);
      throw new Error('Whiteboard room not found.');
    }

    res.json({ message: 'Canvas state saved successfully', board });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBoard,
  getBoards,
  getBoardByRoomId,
  saveBoardState
};
