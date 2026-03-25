import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 bg-gray-50 dark:bg-gray-900">
      <div className="fixed top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Padel Tracker</h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg">Amatorskie turnieje padlowe</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/ranking"
          className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-center"
        >
          Ranking graczy
        </Link>
        <Link
          href="/tournaments"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-center"
        >
          Turnieje
        </Link>
        <Link
          href="/statistics"
          className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors text-center"
        >
          Statystyki
        </Link>
        <Link
          href="/login"
          className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-center"
        >
          Panel admina
        </Link>
      </div>
    </main>
  );
}
