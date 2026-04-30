import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "../firebase";
import { ALLOWED_EMAILS } from "../types";

export type AuthUser = {
  email: string;
  name: string | null;
  photoURL: string | null;
  isDemoMode: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  isAllowed: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_USER: AuthUser = {
  email: "demo@local",
  name: "Demo user",
  photoURL: null,
  isDemoMode: true,
};

function toAuthUser(u: FirebaseUser): AuthUser {
  return {
    email: u.email ?? "",
    name: u.displayName,
    photoURL: u.photoURL,
    isDemoMode: false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      // Demo mode: auto-"sign in" so the app is testable without Firebase
      setUser(DEMO_USER);
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ? toAuthUser(u) : null);
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user,
      loading,
      signIn: async () => {
        if (!isFirebaseConfigured || !auth) {
          setUser(DEMO_USER);
          return;
        }
        await signInWithPopup(auth, googleProvider);
      },
      signOut: async () => {
        if (!isFirebaseConfigured || !auth) {
          setUser(null);
          return;
        }
        await fbSignOut(auth);
      },
      isAllowed: isUserAllowed(user),
    };
  }, [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function isUserAllowed(user: AuthUser | null): boolean {
  if (!user) return false;
  if (user.isDemoMode) return true;
  return (ALLOWED_EMAILS as readonly string[]).includes(user.email);
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
