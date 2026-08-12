const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/collabboard';

  try {
    // Attempt standard connection with 3s timeout
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3000
    });
    console.log(`✅ Connected to MongoDB via URI: ${mongoURI}`);
  } catch (err) {
    console.log('⚠️ Could not connect to local MongoDB. Launching in-memory MongoDB server...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const memoryUri = mongod.getUri();
      await mongoose.connect(memoryUri);
      console.log(`✅ Connected to In-Memory MongoDB at: ${memoryUri}`);
    } catch (memErr) {
      console.error('❌ Failed to start MongoDB Memory Server:', memErr);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
