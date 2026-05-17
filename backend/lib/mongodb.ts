import mongoose from 'mongoose';

declare global {
  var _mongooseConn: Promise<typeof mongoose> | undefined;
}

export async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) throw new Error('MONGODB_URI environment variable is not set');

  if (global._mongooseConn) return global._mongooseConn;
  global._mongooseConn = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  return global._mongooseConn;
}
