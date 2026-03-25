import { prisma } from "@/lib/prisma";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function StatisticsPage() {
  const playerCount = await prisma.player.count();
  const tournamentCount = await prisma.tournament.count();
  const matchCount = await prisma.match.count();

  return (
    <main className="max-w-4xl mx-auto p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Statystyki</h1>
        <ThemeToggle />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 text-center">
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{playerCount}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Graczy</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 text-center">
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{tournamentCount}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Turniejow</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 text-center">
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{matchCount}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Meczy</p>
        </div>
      </div>

      <div className="space-y-6">
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Porownanie graczy</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Wkrotce: porownuj statystyki dwoch lub wiecej graczy obok siebie — punkty, wygrane, przegrane, bilans gemow.
          </p>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Forma graczy</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Wkrotce: wykres formy graczy na przestrzeni turniejow — trend punktow i pozycji w rankingu.
          </p>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Head-to-head</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Wkrotce: historia bezposrednich spotkan miedzy wybranymi graczami.
          </p>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Rekordy</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Wkrotce: najwyzsze wyniki, najdluzsze serie wygranych, najwiecej punktow w jednym turnieju.
          </p>
        </section>
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/"
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
        >
          Powrot na strone glowna
        </Link>
      </div>
    </main>
  );
}
