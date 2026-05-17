const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// Module-level auth token — set by useAuthStore on load/sign-in
let _authToken: string | null = null;
export function setAuthToken(token: string | null) {
  _authToken = token;
}

function authHeaders(): Record<string, string> {
  return _authToken ? { Authorization: `Bearer ${_authToken}` } : {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export interface GoogleAuthResponse {
  token: string;
  user: {
    userId: string;
    username: string;
    email: string;
    avatar?: string;
    highestScore: number;
    totalCoins: number;
    totalGames: number;
    xp: number;
    level: number;
  };
}

export const api = {
  googleAuth: (accessToken: string) =>
    request<GoogleAuthResponse>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ accessToken }),
    }),

  submitScore: (data: {
    userId: string;
    username: string;
    score: number;
    combo: number;
    accuracy: number;
    rounds: number;
    coins: number;
    mode?: 'bubble' | 'daily';
  }) => request('/api/scores', { method: 'POST', body: JSON.stringify(data) }),

  getLeaderboard: (period: 'global' | 'daily' | 'weekly', userId?: string) =>
    request<{ entries: LeaderboardEntry[]; userRank: number | null; period: string }>(
      `/api/leaderboard?period=${period}${userId ? `&userId=${userId}` : ''}`
    ),

  upsertUser: (data: {
    userId: string;
    username: string;
    highestScore?: number;
    totalGames?: number;
    totalCoins?: number;
    xp?: number;
  }) => request('/api/users', { method: 'POST', body: JSON.stringify(data) }),

  getUser: (userId: string) => request(`/api/users?userId=${userId}`),

  getDailyChallenge: () => request('/api/daily'),
};

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  score: number;
}
