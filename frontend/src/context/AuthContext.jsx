import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sync auth state directly with Firebase onAuthStateChanged
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let profile = {
          id: firebaseUser.uid,
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'Movie Lover',
          email: firebaseUser.email,
          created_at: firebaseUser.metadata?.creationTime || new Date().toISOString(),
        };

        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            profile = { ...profile, ...userDoc.data() };
          }
        } catch (err) {
          console.warn('Could not retrieve Firestore user document:', err);
        }

        setUser(profile);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = (token, currentUser) => {
    if (currentUser) {
      setUser(currentUser);
      setIsAuthenticated(true);
    }
  };

  const loginWithGoogle = async () => {
    const res = await authService.loginWithGoogle();
    setUser(res.data.user);
    setIsAuthenticated(true);
    return res;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated,
      login,
      loginWithGoogle,
      logout,
      setUser,
    }),
    [loading, isAuthenticated, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
