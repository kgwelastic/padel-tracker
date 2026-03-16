"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoutButton } from "./LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

export function MobileAdminNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-gray-900 dark:bg-gray-950 text-gray-100 flex items-center justify-between px-4 h-14">
        <span className="font-bold text-base">Padel Admin</span>
        <div className="flex items-center gap-1">
          <ThemeToggle className="text-gray-400 hover:bg-gray-700 dark:hover:bg-gray-800" />
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
            aria-label="Otwórz menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`md:hidden fixed top-0 left-0 h-full z-50 w-64 bg-gray-900 dark:bg-gray-950 text-gray-100 flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 h-14 border-b border-gray-700 dark:border-gray-800 flex items-center justify-between">
          <span className="font-bold text-lg">Padel Admin</span>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
            aria-label="Zamknij menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 py-4 flex flex-col gap-1 px-3">
          <Link href="/admin" onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-lg hover:bg-gray-800 text-sm font-medium">
            Dashboard
          </Link>
          <Link href="/admin/tournaments" onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-lg hover:bg-gray-800 text-sm font-medium">
            Turnieje
          </Link>
          <Link href="/admin/players" onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-lg hover:bg-gray-800 text-sm font-medium">
            Gracze
          </Link>
          <Link href="/admin/admins" onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-lg hover:bg-gray-800 text-sm font-medium">
            Admini
          </Link>
        </nav>
        <div className="px-4 py-4 border-t border-gray-700 dark:border-gray-800 flex flex-col gap-2">
          <Link href="/ranking" onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-200">
            ← Widok publiczny
          </Link>
          <LogoutButton />
        </div>
      </div>
    </>
  );
}
