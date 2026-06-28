import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut, User as FirebaseUser } from "firebase/auth";
import { auth, googleAuthProvider } from "../lib/firebase.ts";
import { User } from "../types.ts";

interface AuthContextType {
  user: User | null;
  fbUser: FirebaseUser | null;
  token: string | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginAsDemoUser: () => Promise<void>;
  loginAsDemoOwner: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync user profile from our backend DB
  const syncUserProfile = async (authToken: string) => {
    try {
      const res = await fetch("/api/users/me", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        const dbUser = await res.json();
        setUser(dbUser);
      } else {
        console.error("Failed to sync user profile from backend");
        setUser(null);
      }
    } catch (err) {
      console.error("Error syncing user profile:", err);
      setUser(null);
    }
  };

  // Listen to Firebase Auth state
  useEffect(() => {
    // Check if demo session exists first
    const demoToken = sessionStorage.getItem("delish_demo_token");
    if (demoToken) {
      setToken(demoToken);
      syncUserProfile(demoToken).finally(() => setLoading(false));
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          setFbUser(firebaseUser);
          setToken(idToken);
          await syncUserProfile(idToken);
        } catch (err) {
          console.error("Error getting Firebase ID token:", err);
        }
      } else {
        setFbUser(null);
        setToken(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      sessionStorage.removeItem("delish_demo_token");
      const result = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await result.user.getIdToken();
      setFbUser(result.user);
      setToken(idToken);
      await syncUserProfile(idToken);
    } catch (err) {
      console.error("Google Sign-In failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemoUser = async () => {
    setLoading(true);
    try {
      const demoToken = "demo-token-user";
      sessionStorage.setItem("delish_demo_token", demoToken);
      setFbUser(null);
      setToken(demoToken);
      await syncUserProfile(demoToken);
    } catch (err) {
      console.error("Demo User Login failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemoOwner = async () => {
    setLoading(true);
    try {
      const demoToken = "demo-token-owner";
      sessionStorage.setItem("delish_demo_token", demoToken);
      setFbUser(null);
      setToken(demoToken);
      await syncUserProfile(demoToken);
    } catch (err) {
      console.error("Demo Owner Login failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      sessionStorage.removeItem("delish_demo_token");
      if (auth.currentUser) {
        await fbSignOut(auth);
      }
      setFbUser(null);
      setToken(null);
      setUser(null);
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    if (token) {
      await syncUserProfile(token);
    }
  };

  // Helper fetch with automatic Authorization headers
  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...options.headers,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    return fetch(url, { ...options, headers });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        fbUser,
        token,
        loading,
        loginWithGoogle,
        loginAsDemoUser,
        loginAsDemoOwner,
        logout,
        refreshUser,
        apiFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
