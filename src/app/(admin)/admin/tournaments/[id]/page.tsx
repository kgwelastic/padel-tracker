import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { enterMatchResult, clearMatchResult } from "./actions";

type Team = {
  id: string;
  name: string | null;
  player1: { id: string; name: string };
  player2: { id: string; name: string } | null;
};

function teamLabel(team: Team) {
  if (team.name) return team.name;
  if (team.player2) return `${team.player1.name} / ${team.player2.name}`;
  return team.player1.name;
}

const SYSTEM_LABELS: Record<string, string> = {
  round_robin: "Round Robin",
  americano: "Americano",
  groups_playoff: "Grupy + Playoff",
  elimination: "Eliminacje",
};

const FORMAT_LABELS: Record<string, string> = {
  singles: "Singiel",
  doubles: "Debel",
};

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
          team1: { include: { player1: true, player2: true } },
          team2: { include: { player1: true, player2: true } },
          sets: { orderBy: { setNumber: "asc" } },
        },
        orderBy: [{ group: "asc" }, { round: "asc" }, { createdAt: "asc" }],
      },
      rankingEntries: {
        include: { team: { include: { player1: true, player2: true } } },
        orderBy: [{ points: "desc" }, { gamesWon: "desc" }],
      },
    },
  });

  if (!tournament) notFound();

  // Group matches by group/round label
  const grouped: Record<string, typeof tournament.matches> = {};
  for (const match of tournament.matches) {
    const key = match.group ?? (match.round ? `Runda ${match.round}` : "Mecze");
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(match);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{tournament.name}</h1>
        <p className="text-gray-500 text-sm">
          {new Date(tournament.date).toLocaleDateString("pl-PL", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          {tournament.location && ` · ${tournament.location}`}
          {" · "}
          {FORMAT_LABELS[tournament.format] ?? tournament.format}
          {" · "}
          {SYSTEM_LABELS[tournament.system] ?? tournament.system}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Ranking */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <span className="font-semibold text-gray-800">Ranking turnieju</span>
          </div>
          {tournament.rankingEntries.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400 text-center">Brak meczów.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Drużyna</th>
                  <th className="px-4 py-2 text-center">Pkt</th>
                  <th className="px-4 py-2 text-center">W/P</th>
                  <th className="px-4 py-2 text-center">Gemy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tournament.rankingEntries.map((e, i) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-2 font-medium text-gray-800">
                      {teamLabel(e.team)}
                    </td>
                    <td className="px-4 py-2 text-center font-bold text-blue-600">{e.points}</td>
                    <td className="px-4 py-2 text-center text-gray-500">
                      {e.wins}/{e.losses}
                    </td>
                    <td className="px-4 py-2 text-center text-gray-500">
                      {e.gamesWon}/{e.gamesLost}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Matches */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          {Object.entries(grouped).map(([label, matches]) => (
            <div key={label} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                <span className="font-semibold text-gray-700 text-sm">{label}</span>
              </div>
              <ul className="divide-y divide-gray-100">
                {matches.map((m) => {
                  const t1Games = m.sets.reduce((a, s) => a + s.team1Score, 0);
                  const t2Games = m.sets.reduce((a, s) => a + s.team2Score, 0);
                  const t1SetsWon = m.sets.filter((s) => s.team1Score > s.team2Score).length;
                  const t2SetsWon = m.sets.filter((s) => s.team2Score > s.team1Score).length;

                  return (
                    <li key={m.id} className="px-4 py-3">
                      {m.status === "completed" ? (
                        /* Completed match — show result */
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 text-sm">
                            <span
                              className={
                                t1SetsWon > t2SetsWon
                                  ? "font-bold text-green-700"
                                  : "text-gray-600"
                              }
                            >
                              {teamLabel(m.team1)}
                            </span>
                            <span className="mx-2 text-gray-400 font-mono">
                              {m.sets
                                .map((s) => `${s.team1Score}:${s.team2Score}`)
                                .join("  ")}
                            </span>
                            <span
                              className={
                                t2SetsWon > t1SetsWon
                                  ? "font-bold text-green-700"
                                  : "text-gray-600"
                              }
                            >
                              {teamLabel(m.team2)}
                            </span>
                            <span className="ml-2 text-xs text-gray-400">
                              ({t1Games}:{t2Games})
                            </span>
                          </div>
                          <form
                            action={async () => {
                              "use server";
                              await clearMatchResult(m.id, id);
                            }}
                          >
                            <button
                              type="submit"
                              className="text-xs text-red-400 hover:text-red-600"
                              title="Usuń wynik"
                            >
                              ✕
                            </button>
                          </form>
                        </div>
                      ) : (
                        /* Pending match — score entry form */
                        <form
                          action={enterMatchResult.bind(null, m.id, id)}
                          className="flex flex-col gap-2"
                        >
                          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <span>{teamLabel(m.team1)}</span>
                            <span className="text-gray-400">vs</span>
                            <span>{teamLabel(m.team2)}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {[1, 2, 3].map((n) => (
                              <div key={n} className="flex items-center gap-1">
                                <span className="text-xs text-gray-400 w-10">Set {n}</span>
                                <input
                                  name={`set${n}_t1`}
                                  type="number"
                                  min="0"
                                  max="99"
                                  placeholder="—"
                                  className="w-12 border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-gray-400">:</span>
                                <input
                                  name={`set${n}_t2`}
                                  type="number"
                                  min="0"
                                  max="99"
                                  placeholder="—"
                                  className="w-12 border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            ))}
                            <button
                              type="submit"
                              className="bg-green-600 text-white text-xs px-3 py-1.5 rounded hover:bg-green-700 transition-colors"
                            >
                              Zapisz
                            </button>
                          </div>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {tournament.matches.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm px-5 py-8 text-gray-400 text-sm text-center">
              Brak meczów w tym turnieju.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
