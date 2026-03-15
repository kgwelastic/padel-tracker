import { prisma } from "@/lib/prisma";

export const revalidate = 60;

export default async function RankingPage() {
  const entries = await prisma.rankingEntry.findMany({
    include: {
      player: true,
      tournament: true,
    },
    orderBy: { points: "desc" },
  });

  // Aggregate across all tournaments
  const aggregated = entries.reduce(
    (acc, entry) => {
      const existing = acc[entry.playerId];
      if (existing) {
        existing.points += entry.points;
        existing.wins += entry.wins;
        existing.losses += entry.losses;
        existing.setsWon += entry.setsWon;
        existing.setsLost += entry.setsLost;
        existing.tournaments += 1;
      } else {
        acc[entry.playerId] = {
          player: entry.player,
          points: entry.points,
          wins: entry.wins,
          losses: entry.losses,
          setsWon: entry.setsWon,
          setsLost: entry.setsLost,
          tournaments: 1,
        };
      }
      return acc;
    },
    {} as Record<
      string,
      {
        player: { id: string; name: string };
        points: number;
        wins: number;
        losses: number;
        setsWon: number;
        setsLost: number;
        tournaments: number;
      }
    >
  );

  const sorted = Object.values(aggregated).sort((a, b) => b.points - a.points);

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
                <th className="px-4 py-3 text-center">Sety</th>
                <th className="px-4 py-3 text-center">Turnieje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((row, i) => (
                <tr key={row.player.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-500">
                    {i + 1}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {row.player.name}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-blue-600">
                    {row.points}
                  </td>
                  <td className="px-4 py-3 text-center text-green-600">
                    {row.wins}
                  </td>
                  <td className="px-4 py-3 text-center text-red-500">
                    {row.losses}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {row.setsWon}/{row.setsLost}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">
                    {row.tournaments}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
