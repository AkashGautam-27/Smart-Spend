import mongoose from 'mongoose';

export async function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartspend';
  
  try {
    console.log(`[Database] Connecting to MongoDB`);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000, // Speed up fallback detection
    });
    console.log(`[Database] MongoDB Connected Successfully`);
    (global as any).isMongoOffline = false;
    return conn;
  } catch (error) {
    (global as any).isMongoOffline = true;
    return mongoose;
  }
}
