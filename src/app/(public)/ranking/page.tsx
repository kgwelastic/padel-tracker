import { prisma } from "@/lib/prisma";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TournamentRankings } from "@/components/TournamentRankings";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const teams = await prisma.team.findMany({
    include: {
      player1: true,
      player2: true,
      rankingEntries: true,
    },
  });

  const playerMap: Record<
    string,
    {
      name: string;
      points: number;
      wins: number;
      losses: number;
      gamesWon: number;
      gamesLost: number;
      tournaments: Set<string>;
    }
  > = {};

  function addToPlayer(playerId: string, playerName: string, entry: {
    tournamentId: string;
    points: number;
    wins: number;
    losses: number;
    gamesWon: number;
    gamesLost: number;
  }) {
    if (!playerMap[playerId]) {
      playerMap[playerId] = {
        name: playerName,
        points: 0,
        wins: 0,
        losses: 0,
        gamesWon: 0,
        gamesLost: 0,
        tournaments: new Set(),
      };
    }
    const p = playerMap[playerId];
    p.points += entry.points;
    p.wins += entry.wins;
    p.losses += entry.losses;
    p.gamesWon += entry.gamesWon;
    p.gamesLost += entry.gamesLost;
    p.tournaments.add(entry.tournamentId);
  }

  for (const team of teams) {
    for (const entry of team.rankingEntries) {
      addToPlayer(team.player1Id, team.player1.name, entry);
      if (team.player2Id && team.player2) {
        addToPlayer(team.player2Id, team.player2.name, entry);
      }
    }
  }

  const sorted = Object.entries(playerMap)
    .map(([id, p]) => ({ id, ...p, tournamentCount: p.tournaments.size }))
    .sort((a, b) => b.points - a.points || b.wins - a.wins || b.gamesWon - a.gamesWon);

  return (
    <main className="max-w-4xl mx-auto p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Ranking graczy</h1>
        <ThemeToggle />
      </div>

      {sorted.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">Brak danych rankingowych.</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Gracz</th>
                <th className="px-4 py-3 text-center">Pkt</th>
                <th className="px-4 py-3 text-center">W</th>
                <th className="px-4 py-3 text-center">P</th>
                <th className="px-4 py-3 text-center">Gemy</th>
                <th className="px-4 py-3 text-center">Turnieje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {sorted.map((row, i) => (
                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 font-medium text-gray-500 dark:text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{row.name}</td>
                  <td className="px-4 py-3 text-center font-bold text-blue-600 dark:text-blue-400">{row.points}</td>
                  <td className="px-4 py-3 text-center text-green-600 dark:text-green-400">{row.wins}</td>
                  <td className="px-4 py-3 text-center text-red-500 dark:text-red-400">{row.losses}</td>
                  <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">
                    {row.gamesWon}/{row.gamesLost}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400">{row.tournamentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      <div className="mt-10">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Wyniki per turniej</h2>
        <TournamentRankings />
      </div>
    </main>
  );
}
