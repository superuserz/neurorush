import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '../../../../lib/mongodb';
import { User } from '../../../../models/User';
import { signJwt } from '../../../../lib/auth';
import { rateLimit } from '../../../../middleware/rateLimit';

const Schema = z.object({
  accessToken: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 10);
  if (limited) return limited;

  try {
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Verify access token by calling Google's userinfo endpoint
    const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${parsed.data.accessToken}` },
    });
    if (!infoRes.ok) {
      return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 });
    }

    const g = (await infoRes.json()) as {
      sub?: string;
      email?: string;
      name?: string;
      picture?: string;
    };

    if (!g.sub || !g.email) {
      return NextResponse.json({ error: 'Incomplete Google profile' }, { status: 401 });
    }

    const googleId = g.sub;
    const email = g.email;
    const username = (g.name ?? email.split('@')[0]).replace(/\s+/g, '').slice(0, 24) || 'Player';

    await connectDB();

    // Upsert by googleId — set mutable fields, initialize immutable fields on insert
    const user = await User.findOneAndUpdate(
      { googleId },
      {
        $set: { email, avatar: g.picture ?? null },
        $setOnInsert: { userId: googleId, username },
      },
      { upsert: true, new: true, select: '-passwordHash -__v' }
    );

    const token = signJwt({ userId: googleId, email });
    return NextResponse.json({ token, user }, { status: 200 });
  } catch (err) {
    console.error('[POST /api/auth/google]', err);
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }
}
