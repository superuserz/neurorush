import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../lib/mongodb';

// Daily challenge is the same for all users on the same day
function getDailySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

const DAILY_CHALLENGES = [
  { category: 'fruits', targetScore: 2000, reward: 200, icon: '🍎', title: 'Fruit Frenzy' },
  { category: 'countries', targetScore: 1500, reward: 150, icon: '🌍', title: 'World Tour' },
  { category: 'animals', targetScore: 1800, reward: 180, icon: '🐯', title: 'Animal Kingdom' },
  { category: 'sports', targetScore: 1600, reward: 160, icon: '⚽', title: 'Sports Star' },
  { category: 'movies', targetScore: 2200, reward: 220, icon: '🎬', title: 'Movie Buff' },
  { category: 'colors', targetScore: 1200, reward: 120, icon: '🎨', title: 'Color Rush' },
  { category: 'brands', targetScore: 1900, reward: 190, icon: '🏷️', title: 'Brand Battle' },
];

export async function GET(req: NextRequest) {
  const seed = getDailySeed();
  const index = seed % DAILY_CHALLENGES.length;
  const challenge = DAILY_CHALLENGES[index];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return NextResponse.json({
    challenge: {
      ...challenge,
      id: `daily_${seed}`,
      date: today.toISOString().split('T')[0],
      expiresAt: tomorrow.toISOString(),
    },
  });
}
