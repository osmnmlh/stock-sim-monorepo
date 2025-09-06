"use client";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import LogoutButton from "./LogoutButton";

export default function AuthMini() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return (
    <div className="p-3 border rounded-md mb-4">
      {user ? (
        <div className="flex items-center gap-3">
          <div className="text-sm">Hello, {user.email ?? user.displayName ?? "User"}</div>
          <LogoutButton />
          <Link className="ml-auto underline text-sm" href="/symbol/AAPL">Go AAPL</Link>
        </div>
      ) : (
        <Link className="underline text-sm" href="/login">Login</Link>
      )}
    </div>
  );
}
