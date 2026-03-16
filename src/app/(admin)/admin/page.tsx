import { prisma } from "@/lib/prisma";
import Link from "next/link";

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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Gracze", value: playerCount, href: "/admin/players" },
          { label: "Turnieje", value: tournamentCount, href: "/admin/tournaments" },
          { label: "Mecze", value: matchCount, href: "/admin/tournaments" },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <p className="text-3xl font-bold text-blue-600">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Ostatnie turnieje</h2>
          <Link href="/admin/tournaments" className="text-sm text-blue-600 hover:underline">
            Wszystkie →
          </Link>
        </div>
        {latestTournaments.length === 0 ? (
          <p className="text-gray-400 text-sm">Brak turniejów. <Link href="/admin/tournaments" className="text-blue-600 hover:underline">Dodaj pierwszy</Link></p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {latestTournaments.map((t) => (
              <li key={t.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">{t.name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(t.date).toLocaleDateString("pl-PL")}
                    {t.location && ` · ${t.location}`}
                  </p>
                </div>
                <Link
                  href={`/admin/tournaments/${t.id}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Otwórz →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
