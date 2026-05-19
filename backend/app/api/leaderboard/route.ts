import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../lib/mongodb';
import { Score } from '../../../models/Score';
import { rateLimit } from '../../../middleware/rateLimit';

type Period = 'global' | 'daily' | 'weekly';
type Mode = 'trivia' | 'galactic' | 'daily';

const VALID_MODES: readonly Mode[] = ['trivia', 'galactic', 'daily'];

function getPeriodFilter(period: Period): Record<string, unknown> {
  const now = new Date();
  if (period === 'daily') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { createdAt: { $gte: start } };
  }
  if (period === 'weekly') {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return { createdAt: { $gte: start } };
  }
  return {};
}

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, 60);
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const period = (searchParams.get('period') ?? 'global') as Period;
  const mode = (searchParams.get('mode') ?? 'trivia') as Mode;
  const userId = searchParams.get('userId');
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 100);

  if (!['global', 'daily', 'weekly'].includes(period)) {
    return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
  }
  if (!VALID_MODES.includes(mode)) {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  }

  try {
    await connectDB();
    const filter = { ...getPeriodFilter(period), mode };

    const pipeline = [
      { $match: filter },
      {
        $group: {
          _id: '$userId',
          username: { $first: '$username' },
          score: { $max: '$score' },
        },
      },
      { $sort: { score: -1 as const } },
      { $limit: limit },
    ];

    const entries = await Score.aggregate(pipeline);
    const ranked = entries.map((e, i) => ({
      rank: i + 1,
      userId: e._id,
      username: e.username,
      score: e.score,
    }));

    // Get user rank if userId provided
    let userRank: number | null = null;
    if (userId) {
      const userEntry = ranked.find((e) => e.userId === userId);
      if (userEntry) {
        userRank = userEntry.rank;
      } else {
        // Count how many beat the user
        const userBestScore = await Score.find({ userId, ...filter }).sort({ score: -1 }).limit(1);
        if (userBestScore.length > 0) {
          const countAbove = await Score.aggregate([
            { $match: filter },
            { $group: { _id: '$userId', best: { $max: '$score' } } },
            { $match: { best: { $gt: userBestScore[0].score } } },
            { $count: 'n' },
          ]);
          userRank = (countAbove[0]?.n ?? 0) + 1;
        }
      }
    }

    return NextResponse.json({ entries: ranked, userRank, period, mode });
  } catch (err) {
    console.error('[GET /api/leaderboard]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
