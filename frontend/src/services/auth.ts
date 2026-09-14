import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';
import { request } from './api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  email_verified: boolean;
  firebase_uid?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export const authService = {
  /**
   * Registers a user in Firebase Auth, updates profile, and syncs profile with PostgreSQL.
   */
  async register(data: { email: string; password: string; name: string }): Promise<User> {
    if (isFirebaseConfigured) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        if (data.name && userCredential.user) {
          try {
            await updateProfile(userCredential.user, { displayName: data.name });
          } catch {
            // Profile display name update is best effort
          }
        }
        // Sync profile with PostgreSQL backend
        return await request<User>('/auth/firebase-sync', {
          method: 'POST',
          body: JSON.stringify({ name: data.name }),
        });
      } catch (err: any) {
        // If Firebase error occurred, translate or throw
        throw err;
      }
    }

    // Fallback to legacy backend registration
    return request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Signs in via Firebase Auth or falls back to legacy backend endpoint.
   */
  async login(data: { email: string; password: string }): Promise<User | TokenResponse> {
    if (isFirebaseConfigured) {
      try {
        await signInWithEmailAndPassword(auth, data.email, data.password);
        // Successfully authenticated via Firebase; fetch mapped PostgreSQL user profile
        return await this.getMe();
      } catch (fbErr: any) {
        // If demo credentials or Firebase user not found, try legacy backend login
        if (data.email.toLowerCase().includes('demo@feedbackpro.ai')) {
          return await this.legacyLogin(data);
        }
        throw fbErr;
      }
    }

    return await this.legacyLogin(data);
  },

  async legacyLogin(data: { email: string; password: string }): Promise<TokenResponse> {
    const res = await request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    localStorage.setItem('access_token', res.access_token);
    localStorage.setItem('refresh_token', res.refresh_token);
    return res;
  },

  /**
   * Signs out from Firebase and clears local storage.
   */
  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }

    const refresh_token = localStorage.getItem('refresh_token');
    if (refresh_token) {
      try {
        await request('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refresh_token }),
        });
      } catch {
        // ignore error during logout
      }
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  /**
   * Retrieves the current user from the PostgreSQL database.
   */
  async getMe(): Promise<User> {
    return request<User>('/auth/me');
  },

  /**
   * Checks whether the user is currently authenticated in Firebase or via local storage token.
   */
  isAuthenticated(): boolean {
    return Boolean(auth.currentUser || localStorage.getItem('access_token'));
  },

  /**
   * Subscribes to Firebase auth state changes.
   */
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },
};
