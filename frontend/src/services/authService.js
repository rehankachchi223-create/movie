import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider, isFirebaseConfigured } from '../firebase/config';

function requireFirebaseConfig() {
  if (!isFirebaseConfigured || !auth || !db) {
    throw new Error('Sign-in is unavailable until Firebase is configured for this deployment.');
  }
}

export const authService = {
  /**
   * Register a new user with Email, Password, and Display Name.
   */
  register: async ({ email, password, name }) => {
    requireFirebaseConfig();
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (name) {
      await updateProfile(user, { displayName: name });
    }

    const userData = {
      id: user.uid,
      uid: user.uid,
      name: name || user.displayName || 'Movie Lover',
      email: user.email,
      created_at: new Date().toISOString(),
    };

    // Store user document in Firestore
    try {
      await setDoc(doc(db, 'users', user.uid), userData, { merge: true });
    } catch (e) {
      console.warn('Could not save user profile document to Firestore:', e);
    }

    return {
      data: {
        access_token: await user.getIdToken(),
        user: userData,
      },
    };
  },

  /**
   * Log in an existing user with Email and Password.
   */
  login: async ({ email, password }) => {
    requireFirebaseConfig();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    let profile = {
      id: user.uid,
      uid: user.uid,
      name: user.displayName || 'Movie Lover',
      email: user.email,
      created_at: user.metadata?.creationTime || new Date().toISOString(),
    };

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        profile = { ...profile, ...userDoc.data() };
      }
    } catch (e) {
      console.warn('Could not load user profile from Firestore:', e);
    }

    return {
      data: {
        access_token: await user.getIdToken(),
        user: profile,
      },
    };
  },

  /**
   * One-click Google Sign-in with Firebase.
   */
  loginWithGoogle: async () => {
    requireFirebaseConfig();
    const userCredential = await signInWithPopup(auth, googleProvider);
    const user = userCredential.user;

    const userData = {
      id: user.uid,
      uid: user.uid,
      name: user.displayName || 'Movie Lover',
      email: user.email,
      created_at: user.metadata?.creationTime || new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'users', user.uid), userData, { merge: true });
    } catch (e) {
      console.warn('Could not save Google user profile to Firestore:', e);
    }

    return {
      data: {
        access_token: await user.getIdToken(),
        user: userData,
      },
    };
  },

  /**
   * Sign out the currently authenticated user.
   */
  logout: async () => {
    requireFirebaseConfig();
    await signOut(auth);
    return { data: { message: 'Logged out successfully' } };
  },

  /**
   * Fetch current user profile.
   */
  getCurrentUser: async () => {
    requireFirebaseConfig();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Not authenticated');
    }

    let profile = {
      id: currentUser.uid,
      uid: currentUser.uid,
      name: currentUser.displayName || 'Movie Lover',
      email: currentUser.email,
      created_at: currentUser.metadata?.creationTime || new Date().toISOString(),
    };

    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        profile = { ...profile, ...userDoc.data() };
      }
    } catch (e) {
      console.warn('Could not load user profile doc from Firestore:', e);
    }

    return { data: profile };
  },

  /**
   * Legacy token refresh stub for backwards compatibility.
   */
  refresh: async () => {
    requireFirebaseConfig();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('No user to refresh');
    }
    const token = await currentUser.getIdToken(true);
    return { data: { access_token: token } };
  },
};
