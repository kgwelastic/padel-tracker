import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const teams = await prisma.team.findMany({
    include: {
      player1: true,
      player2: true,
      rankingEntries: true,
    },
  });

  // Aggregate stats per player across all tournaments
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
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Ranking graczy</h1>

      {sorted.length === 0 ? (
        <p className="text-gray-500">Brak danych rankingowych.</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
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
            <tbody className="divide-y divide-gray-100">
              {sorted.map((row, i) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{row.name}</td>
                  <td className="px-4 py-3 text-center font-bold text-blue-600">{row.points}</td>
                  <td className="px-4 py-3 text-center text-green-600">{row.wins}</td>
                  <td className="px-4 py-3 text-center text-red-500">{row.losses}</td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {row.gamesWon}/{row.gamesLost}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">{row.tournamentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
