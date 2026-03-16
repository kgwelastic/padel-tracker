import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LogoutButton } from "./LogoutButton";
import { SessionProvider } from "./SessionProvider";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <SessionProvider>
      <div className="min-h-screen flex">
        <aside className="w-56 bg-gray-900 dark:bg-gray-950 text-gray-100 flex flex-col">
          <div className="px-5 py-4 border-b border-gray-700 dark:border-gray-800 flex items-center justify-between">
            <span className="font-bold text-lg">Padel Admin</span>
            <ThemeToggle className="text-gray-400 hover:bg-gray-700 dark:hover:bg-gray-800" />
          </div>
          <nav className="flex-1 py-4 flex flex-col gap-1 px-3">
            <Link
              href="/admin"
              className="px-3 py-2 rounded-lg hover:bg-gray-800 text-sm font-medium"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/tournaments"
              className="px-3 py-2 rounded-lg hover:bg-gray-800 text-sm font-medium"
            >
              Turnieje
            </Link>
            <Link
              href="/admin/players"
              className="px-3 py-2 rounded-lg hover:bg-gray-800 text-sm font-medium"
            >
              Gracze
            </Link>
            <Link
              href="/admin/admins"
              className="px-3 py-2 rounded-lg hover:bg-gray-800 text-sm font-medium"
            >
              Admini
            </Link>
          </nav>
          <div className="px-4 py-4 border-t border-gray-700 dark:border-gray-800 flex flex-col gap-2">
            <Link
              href="/ranking"
              className="text-xs text-gray-400 hover:text-gray-200"
            >
              ← Widok publiczny
            </Link>
            <LogoutButton />
          </div>
        </aside>

        <main className="flex-1 bg-gray-50 dark:bg-gray-900 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}
