import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  userId: string;
  username: string;
  googleId?: string;
  email?: string;
  passwordHash?: string;
  avatar?: string;
  totalCoins: number;
  highestScore: number;
  totalGames: number;
  longestStreak: number;
  currentStreak: number;
  unlockedAchievements: string[];
  level: number;
  xp: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, trim: true, maxlength: 24 },
    googleId: { type: String, sparse: true, index: true },
    email: { type: String, sparse: true, index: true, lowercase: true },
    passwordHash: { type: String },
    avatar: { type: String },
    totalCoins: { type: Number, default: 500, min: 0 },
    highestScore: { type: Number, default: 0, min: 0 },
    totalGames: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0, min: 0 },
    currentStreak: { type: Number, default: 0, min: 0 },
    unlockedAchievements: { type: [String], default: [] },
    level: { type: Number, default: 1, min: 1 },
    xp: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
