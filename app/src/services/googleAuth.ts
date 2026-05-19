import { Platform } from 'react-native';
import {
  GoogleSignin,
  isSuccessResponse,
  type User as GoogleUserPayload,
} from '@react-native-google-signin/google-signin';

export interface GoogleSignInResult {
  idToken: string;
  user: { id: string; email: string; name: string | null; photo: string | null };
}

let configured = false;

export function configureGoogleSignIn() {
  // Web uses @react-oauth/google via <WebOAuthProvider> / <GoogleSignInBlock>;
  // this module is only meaningful on native.
  if (Platform.OS === 'web') return;
  if (configured) return;
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
    offlineAccess: false,
  });
  configured = true;
}

function toResult(payload: GoogleUserPayload): GoogleSignInResult | null {
  if (!payload.idToken) return null;
  return {
    idToken: payload.idToken,
    user: {
      id: payload.user.id,
      email: payload.user.email,
      name: payload.user.name,
      photo: payload.user.photo,
    },
  };
}

export async function googleSignIn(): Promise<GoogleSignInResult | null> {
  if (Platform.OS === 'web') {
    throw new Error('Web sign-in uses <GoogleSignInBlock>; do not call googleSignIn() on web.');
  }
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return null;
  return toResult(response.data);
}

export async function googleSignOut() {
  if (Platform.OS === 'web') return;
  try {
    await GoogleSignin.signOut();
  } catch {
    // best-effort — session may already be gone
  }
}
