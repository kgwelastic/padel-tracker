import { prisma } from "@/lib/prisma";
import Link from "next/link";

const SYSTEM_LABELS: Record<string, string> = {
  round_robin: "Round Robin",
  americano: "Americano",
  mexicano: "Mexicano",
  groups_playoff: "Grupy + Playoff",
  elimination: "Eliminacje",
};

function teamLabel(team: {
  name: string | null;
  player1: { name: string };
  player2: { name: string } | null;
}) {
  if (team.player2) return `${team.player1.name} / ${team.player2.name}`;
  return team.player1.name;
}

export async function TournamentRankings({
  limit,
  showLinks = false,
}: {
  limit?: number;
  showLinks?: boolean;
}) {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { date: "desc" },
    take: limit,
    include: {
      rankingEntries: {
        include: { team: { include: { player1: true, player2: true } } },
        orderBy: [{ points: "desc" }, { gamesWon: "desc" }],
      },
    },
  });

  if (tournaments.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      {tournaments.map((t) => {
        const isAmericano = t.system === "americano" || t.system === "mexicano";
        const entries = isAmericano
          ? t.rankingEntries
              .filter((e) => e.team.player2Id === null)
              .sort((a, b) => b.points - a.points || b.wins - a.wins)
          : t.rankingEntries;

        return (
          <div
            key={t.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
          >
            {/* Tournament header */}
            <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                  {t.name}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {new Date(t.date).toLocaleDateString("pl-PL", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  {t.location && ` · ${t.location}`}
                  {" · "}
                  {SYSTEM_LABELS[t.system] ?? t.system}
                </p>
              </div>
              {showLinks && (
                <Link
                  href={`/admin/tournaments/${t.id}`}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex-shrink-0 ml-4"
                >
                  Wyniki →
                </Link>
              )}
            </div>

            {entries.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-400 dark:text-gray-500 text-center">
                Brak wyników.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30">
                    <tr>
                      <th className="px-4 py-2 text-left w-8">#</th>
                      <th className="px-4 py-2 text-left">
                        {isAmericano ? "Gracz" : "Drużyna"}
                      </th>
                      <th className="px-4 py-2 text-center">Pkt</th>
                      <th className="px-4 py-2 text-center">W</th>
                      <th className="px-4 py-2 text-center">P</th>
                      {!isAmericano && (
                        <th className="px-4 py-2 text-center">Gemy</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {entries.map((e, i) => (
                      <tr
                        key={e.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="px-4 py-2 text-gray-400 dark:text-gray-500">
                          {i + 1}
                        </td>
                        <td className="px-4 py-2 font-medium text-gray-800 dark:text-gray-100">
                          {isAmericano
                            ? e.team.player1.name
                            : teamLabel(e.team)}
                        </td>
                        <td className="px-4 py-2 text-center font-bold text-blue-600 dark:text-blue-400">
                          {e.points}
                        </td>
                        <td className="px-4 py-2 text-center text-green-600 dark:text-green-400">
                          {e.wins}
                        </td>
                        <td className="px-4 py-2 text-center text-red-500 dark:text-red-400">
                          {e.losses}
                        </td>
                        {!isAmericano && (
                          <td className="px-4 py-2 text-center text-gray-500 dark:text-gray-400">
                            {e.gamesWon}/{e.gamesLost}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
