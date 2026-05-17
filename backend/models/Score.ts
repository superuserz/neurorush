import mongoose, { Schema, Document } from 'mongoose';

export interface IScore extends Document {
  userId: string;
  username: string;
  score: number;
  combo: number;
  accuracy: number;
  rounds: number;
  coins: number;
  mode: 'bubble' | 'daily';
  createdAt: Date;
}

const ScoreSchema = new Schema<IScore>(
  {
    userId: { type: String, required: true, index: true },
    username: { type: String, required: true },
    score: { type: Number, required: true, min: 0 },
    combo: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0, min: 0, max: 100 },
    rounds: { type: Number, default: 1 },
    coins: { type: Number, default: 0 },
    mode: { type: String, enum: ['bubble', 'daily'], default: 'bubble' },
  },
  { timestamps: true }
);

ScoreSchema.index({ score: -1 });
ScoreSchema.index({ userId: 1, score: -1 });

export const Score = mongoose.models.Score || mongoose.model<IScore>('Score', ScoreSchema);
