const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoURI =
    process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/collabboard";

  try {
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log(`Connected to MongoDB: ${mongoURI}`);
  } catch (err) {
    console.log("Local MongoDB not available. Trying in-memory database...");

    try {
      const { MongoMemoryServer } = require("mongodb-memory-server");
      const mongod = await MongoMemoryServer.create();
      const memoryUri = mongod.getUri();

      await mongoose.connect(memoryUri);
      console.log(`Connected to in-memory MongoDB: ${memoryUri}`);
    } catch (memErr) {
      console.error("Failed to start in-memory MongoDB:", memErr);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
