import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '../../../lib/mongodb';
import { User } from '../../../models/User';
import { rateLimit } from '../../../middleware/rateLimit';

const UpsertUserSchema = z.object({
  userId: z.string().min(1).max(64),
  username: z.string().min(1).max(24),
  totalCoins: z.number().int().min(0).optional(),
  highestScore: z.number().int().min(0).optional(),
  totalGames: z.number().int().min(0).optional(),
  currentStreak: z.number().int().min(0).optional(),
  xp: z.number().int().min(0).optional(),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  try {
    await connectDB();
    const user = await User.findOne({ userId }).select('-passwordHash -__v');
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 10);
  if (limited) return limited;

  try {
    const body = await req.json();
    const parsed = UpsertUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    await connectDB();
    const { userId, username, ...updates } = parsed.data;

    const user = await User.findOneAndUpdate(
      { userId },
      { $set: { username, ...updates } },
      { upsert: true, new: true, select: '-passwordHash -__v' }
    );

    return NextResponse.json({ user }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
