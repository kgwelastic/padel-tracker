import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { TournamentRankings } from "@/components/TournamentRankings";

export default async function AdminDashboard() {
  const [playerCount, tournamentCount, matchCount] = await Promise.all([
    prisma.player.count(),
    prisma.tournament.count(),
    prisma.match.count(),
  ]);

  const latestTournaments = await prisma.tournament.findMany({
    orderBy: { date: "desc" },
    take: 5,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Gracze", value: playerCount, href: "/admin/players" },
          { label: "Turnieje", value: tournamentCount, href: "/admin/tournaments" },
          { label: "Mecze", value: matchCount, href: "/admin/tournaments" },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stat.value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">Ostatnie turnieje</h2>
          <Link href="/admin/tournaments" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Wszystkie →
          </Link>
        </div>
        {latestTournaments.length === 0 ? (
          <p className="text-gray-400 dark:text-gray-500 text-sm">Brak turniejów. <Link href="/admin/tournaments" className="text-blue-600 dark:text-blue-400 hover:underline">Dodaj pierwszy</Link></p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {latestTournaments.map((t) => (
              <li key={t.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-100">{t.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(t.date).toLocaleDateString("pl-PL")}
                    {t.location && ` · ${t.location}`}
                  </p>
                </div>
                <Link
                  href={`/admin/tournaments/${t.id}`}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Otwórz →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">Wyniki per turniej</h2>
        <Link href="/admin/tournaments" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          Wszystkie →
        </Link>
      </div>
      <TournamentRankings showLinks limit={5} />
    </div>
  );
}
