import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { addMatch, deleteMatch } from "./actions";

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      matches: {
        include: {
          player1: true,
          player2: true,
          sets: { orderBy: { setNumber: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      },
      rankingEntries: {
        include: { player: true },
        orderBy: { points: "desc" },
      },
    },
  });

  if (!tournament) notFound();

  const players = await prisma.player.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{tournament.name}</h1>
        <p className="text-gray-500 text-sm">
          {new Date(tournament.date).toLocaleDateString("pl-PL", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          {tournament.location && ` · ${tournament.location}`}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Add match form */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Dodaj mecz</h2>
          <form
            action={addMatch.bind(null, id)}
            className="flex flex-col gap-3"
          >
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Faza / runda
              </label>
              <input
                name="round"
                placeholder="np. Grupa A, Półfinał"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Gracz 1 *
                </label>
                <select
                  name="player1Id"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Wybierz...</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Gracz 2 *
                </label>
                <select
                  name="player2Id"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Wybierz...</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">
                Wyniki setów *
              </p>
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-400 w-10">Set {n}</span>
                  <input
                    name={`set${n}_p1`}
                    type="number"
                    min="0"
                    max="99"
                    placeholder="G1"
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-400">:</span>
                  <input
                    name={`set${n}_p2`}
                    type="number"
                    min="0"
                    max="99"
                    placeholder="G2"
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              Zapisz mecz
            </button>
          </form>
        </div>

        {/* Ranking */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <span className="font-semibold text-gray-800">Ranking turnieju</span>
          </div>
          {tournament.rankingEntries.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400 text-center">
              Brak meczów.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Gracz</th>
                  <th className="px-4 py-2 text-center">Pkt</th>
                  <th className="px-4 py-2 text-center">W/P</th>
                  <th className="px-4 py-2 text-center">Sety</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tournament.rankingEntries.map((e, i) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-2 font-medium text-gray-800">
                      {e.player.name}
                    </td>
                    <td className="px-4 py-2 text-center font-bold text-blue-600">
                      {e.points}
                    </td>
                    <td className="px-4 py-2 text-center text-gray-500">
                      {e.wins}/{e.losses}
                    </td>
                    <td className="px-4 py-2 text-center text-gray-500">
                      {e.setsWon}/{e.setsLost}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Match list */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <span className="font-semibold text-gray-800">
              Mecze ({tournament.matches.length})
            </span>
          </div>
          {tournament.matches.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400 text-center">
              Brak meczów.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {tournament.matches.map((m) => {
                const p1Sets = m.sets.filter(
                  (s) => s.player1Score > s.player2Score
                ).length;
                const p2Sets = m.sets.filter(
                  (s) => s.player2Score > s.player1Score
                ).length;
                return (
                  <li key={m.id} className="px-4 py-3">
                    {m.round && (
                      <p className="text-xs text-gray-400 mb-1">{m.round}</p>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 text-sm">
                        <span
                          className={
                            p1Sets > p2Sets
                              ? "font-bold text-green-700"
                              : "text-gray-600"
                          }
                        >
                          {m.player1.name}
                        </span>
                        <span className="mx-2 text-gray-400">
                          {m.sets.map((s) => `${s.player1Score}:${s.player2Score}`).join(", ")}
                        </span>
                        <span
                          className={
                            p2Sets > p1Sets
                              ? "font-bold text-green-700"
                              : "text-gray-600"
                          }
                        >
                          {m.player2.name}
                        </span>
                      </div>
                      <form
                        action={async () => {
                          "use server";
                          await deleteMatch(m.id, id);
                        }}
                      >
                        <button
                          type="submit"
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          ✕
                        </button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
