"use client";

import { useState } from "react";
import { auth } from "../../lib/firebase/client";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signInGoogle() {
    setBusy(true);
    setError(null);
    try {
      const prov = new GoogleAuthProvider();
      await signInWithPopup(auth, prov);
      router.replace("/"); // or to a dashboard
    } catch (e: any) {
      setError(e?.message ?? "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function signInEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pwd);
      router.replace("/");
    } catch (err: any) {
      // Optional: if user-not-found → create:
      if (err?.code === "auth/invalid-credential" || err?.code === "auth/user-not-found") {
        try {
          await createUserWithEmailAndPassword(auth, email, pwd);
          router.replace("/");
          return;
        } catch (err2: any) {
          setError(err2?.message ?? "Sign up failed");
        }
      } else {
        setError(err?.message ?? "Sign in failed");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>

      <button
        onClick={signInGoogle}
        disabled={busy}
        className="w-full rounded-md border px-4 py-2"
      >
        Continue with Google
      </button>

      <div className="text-center text-sm text-gray-500">or</div>

      <form onSubmit={signInEmail} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.currentTarget.value)}
          placeholder="Email"
          required
          className="w-full rounded-md border px-3 py-2"
        />
        <input
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.currentTarget.value)}
          placeholder="Password"
          required
          className="w-full rounded-md border px-3 py-2"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md border px-4 py-2"
        >
          {busy ? "Please wait…" : "Sign in / Sign up"}
        </button>
      </form>

      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="text-sm text-gray-500">
        <Link href="/">Back to home</Link>
      </div>
    </div>
  );
}
