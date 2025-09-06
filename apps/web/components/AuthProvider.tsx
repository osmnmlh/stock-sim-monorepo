"use client";

import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth } from "../lib/firebase/client";
import { onAuthStateChanged, User } from "firebase/auth";

type Ctx = {
  user: User | null;
  loading: boolean;
  error: string | null;
};

const AuthContext = createContext<Ctx>({ user: null, loading: true, error: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(
      auth,
      (u) => {
        setUser(u);
        setLoading(false);
      },
      (e) => {
        setError(e?.message ?? "Auth error");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const value = useMemo(() => ({ user, loading, error }), [user, loading, error]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
