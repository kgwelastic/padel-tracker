"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-xs text-gray-400 hover:text-red-400 text-left"
    >
      Wyloguj
    </button>
  );
}
