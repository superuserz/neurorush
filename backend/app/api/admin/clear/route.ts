import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../../lib/mongodb';
import { Score } from '../../../../models/Score';

// One-time endpoint to wipe all scores (fake/test data cleanup).
// Protected by ADMIN_SECRET env var.
export async function DELETE(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  const auth = req.headers.get('x-admin-secret');
  if (auth !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const result = await Score.deleteMany({});
    return NextResponse.json({ deleted: result.deletedCount });
  } catch (err) {
    console.error('[DELETE /api/admin/clear]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
