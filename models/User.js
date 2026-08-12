const mongoose = require('mongoose');

const colors = [
  '#ef4444', '#f97316', '#f59e0b', '#10b981',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
];

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    minlength: 2,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  avatarColor: {
    type: String,
    default: () => colors[Math.floor(Math.random() * colors.length)]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Remove password when returning JSON
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', userSchema);
