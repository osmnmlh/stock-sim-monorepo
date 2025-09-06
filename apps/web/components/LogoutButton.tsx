"use client";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase/client";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut(auth)}
      className="rounded-md border px-3 py-2 text-sm"
    >
      Log out
    </button>
  );
}
