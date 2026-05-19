import type { ReactNode } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';

export function WebOAuthProvider({ children }: { children: ReactNode }) {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!clientId) return <>{children}</>;
  return <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>;
}
