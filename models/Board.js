const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    default: 'Untitled Board'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaborators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Stores canvas draw history: array of stroke/shape/clear objects
  drawData: {
    type: Array,
    default: []
  },
  // Stores persistent room chat messages
  chatMessages: [{
    sender: { type: String, required: true },
    senderId: { type: String },
    color: { type: String, default: '#8b5cf6' },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

boardSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Board', boardSchema);
