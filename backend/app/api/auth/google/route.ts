import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { connectDB } from '../../../../lib/mongodb';
import { User } from '../../../../models/User';
import { signJwt } from '../../../../lib/auth';
import { rateLimit } from '../../../../middleware/rateLimit';

const Schema = z.object({
  idToken: z.string().min(1),
});

const VALID_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

const client = new OAuth2Client();

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, 10);
  if (limited) return limited;

  try {
    const audience = process.env.GOOGLE_WEB_CLIENT_ID;
    if (!audience) {
      console.error('[POST /api/auth/google] GOOGLE_WEB_CLIENT_ID is not set');
      return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
    }

    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: parsed.data.idToken,
        audience,
      });
      payload = ticket.getPayload();
    } catch {
      return NextResponse.json({ error: 'Invalid Google token' }, { status: 401 });
    }

    if (
      !payload ||
      !payload.sub ||
      !payload.email ||
      payload.email_verified !== true ||
      !payload.iss ||
      !VALID_ISSUERS.has(payload.iss)
    ) {
      return NextResponse.json({ error: 'Invalid Google profile' }, { status: 401 });
    }

    const googleId = payload.sub;
    const email = payload.email;
    const username =
      (payload.name ?? email.split('@')[0]).replace(/\s+/g, '').slice(0, 24) || 'Player';

    await connectDB();

    const user = await User.findOneAndUpdate(
      { googleId },
      {
        $set: { email, avatar: payload.picture ?? null },
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
