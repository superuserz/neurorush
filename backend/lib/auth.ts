import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: string;
  email: string;
}

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return s;
}

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, secret(), { expiresIn: '90d' });
}

export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, secret()) as JwtPayload;
}
