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
    // Web build of the lib returns a User directly (resolved via Metro's .web.ts);
    // native types don't reflect that, hence the cast.
    const payload = (await GoogleSignin.signIn()) as unknown as GoogleUserPayload;
    return toResult(payload);
  }
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return null;
  return toResult(response.data);
}

export async function googleSignOut() {
  try {
    await GoogleSignin.signOut();
  } catch {
    // best-effort — session may already be gone
  }
}
