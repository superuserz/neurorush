import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '../../../lib/mongodb';
import { Score } from '../../../models/Score';
import { User } from '../../../models/User';
import { rateLimit } from '../../../middleware/rateLimit';
import { verifyJwt } from '../../../lib/auth';

const SubmitScoreSchema = z.object({
  userId: z.string().min(1).max(64),
  username: z.string().min(1).max(24),
  score: z.number().int().min(0).max(999999),
  combo: z.number().int().min(0).max(1000),
  accuracy: z.number().min(0).max(100),
  rounds: z.number().int().min(1),
  coins: z.number().int().min(0),
  mode: z.enum(['trivia', 'galactic', 'daily']).default('trivia'),
});

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 20);
  if (limited) return limited;

  // Extract authenticated userId from JWT if provided
  let jwtUserId: string | null = null;
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const claims = verifyJwt(authHeader.slice(7));
      jwtUserId = claims.userId;
    } catch {
      // Invalid token — fall back to anonymous submission
    }
  }

  try {
    const body = await req.json();
    const parsed = SubmitScoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }

    await connectDB();
    const data = parsed.data;

    // Use JWT userId if authenticated (prevents identity spoofing on leaderboard)
    if (jwtUserId) data.userId = jwtUserId;

    // Basic anti-cheat sanity check
    if (data.score > data.rounds * 2500 || data.score > 500_000) {
      return NextResponse.json({ error: 'Score validation failed' }, { status: 400 });
    }

    const score = await Score.create(data);

    // Update user high score (overall + per-mode for trivia/galactic)
    const maxUpdate: Record<string, number> = { highestScore: data.score };
    if (data.mode === 'trivia' || data.mode === 'galactic') {
      maxUpdate[`highestScores.${data.mode}`] = data.score;
    }
    await User.findOneAndUpdate(
      { userId: data.userId },
      {
        $max: maxUpdate,
        $inc: { totalGames: 1, xp: Math.floor(data.score / 10) },
        $setOnInsert: { username: data.username },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, scoreId: score._id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/scores]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  try {
    await connectDB();
    const scores = await Score.find({ userId }).sort({ score: -1 }).limit(10).select('-__v');
    return NextResponse.json({ scores });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
