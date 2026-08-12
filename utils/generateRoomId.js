const crypto = require('crypto');

const generateRoomId = () => {
  return 'board-' + crypto.randomBytes(4).toString('hex');
};

module.exports = generateRoomId;
