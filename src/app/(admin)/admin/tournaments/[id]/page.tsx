import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import {
  enterMatchResult,
  clearMatchResult,
  generateNextAmericanoRound,
  generateAmericanoFinalRound,
} from "./actions";
import { AmericanoScoreForm } from "./AmericanoScoreForm";

type Team = {
  id: string;
  name: string | null;
  player1Id: string;
  player2Id: string | null;
  player1: { id: string; name: string };
  player2: { id: string; name: string } | null;
};

function teamLabel(team: Team) {
  if (team.player2) return `${team.player1.name} / ${team.player2.name}`;
  return team.player1.name;
}

const SYSTEM_LABELS: Record<string, string> = {
  round_robin: "Round Robin",
  americano: "Americano",
  groups_playoff: "Grupy + Playoff",
  elimination: "Eliminacje",
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

  const isAmericano = tournament.system === "americano";

  // ── Americano-specific computed data ──────────────────────
  // Individual player rankings = entries where team.player2Id is null
  // For Americano: points = total game points scored (primary sort), wins as tiebreaker
  const individualRankings = isAmericano
    ? tournament.rankingEntries
        .filter((e) => e.team.player2Id === null)
        .sort((a, b) => b.points - a.points || b.wins - a.wins)
    : [];

  // Current round state (for Americano controls)
  const roundNumbers = tournament.matches
    .map((m) => m.round)
    .filter((r): r is number => r !== null);
  const maxRound = roundNumbers.length > 0 ? Math.max(...roundNumbers) : 0;

  const currentRoundMatches = tournament.matches.filter(
    (m) => m.round === maxRound && m.group !== "Final"
  );
  const allCurrentCompleted =
    currentRoundMatches.length > 0 &&
    currentRoundMatches.every((m) => m.status === "completed");
  const hasFinalRound = tournament.matches.some((m) => m.group === "Final");
  const finalRoundCompleted =
    hasFinalRound &&
    tournament.matches
      .filter((m) => m.group === "Final")
      .every((m) => m.status === "completed");

  // Players sitting out current round
  const activePlayerIdsInCurrentRound = new Set<string>();
  for (const match of currentRoundMatches) {
    activePlayerIdsInCurrentRound.add(match.team1.player1Id);
    if (match.team1.player2Id) activePlayerIdsInCurrentRound.add(match.team1.player2Id);
    activePlayerIdsInCurrentRound.add(match.team2.player1Id);
    if (match.team2.player2Id) activePlayerIdsInCurrentRound.add(match.team2.player2Id);
  }
  const sittingOut = individualRankings.filter(
    (e) => !activePlayerIdsInCurrentRound.has(e.team.player1Id)
  );

  // ── Match grouping ────────────────────────────────────────
  const grouped: Record<string, typeof tournament.matches> = {};
  for (const match of tournament.matches) {
    const key =
      match.group === "Final"
        ? "Final"
        : match.round
        ? `Runda ${match.round}`
        : "Mecze";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(match);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tournament.name}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {new Date(tournament.date).toLocaleDateString("pl-PL", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {tournament.location && ` · ${tournament.location}`}
            {" · "}
            {SYSTEM_LABELS[tournament.system] ?? tournament.system}
            {isAmericano && ` · ${tournament.courts} ${tournament.courts === 1 ? "kort" : "korty"} · do ${tournament.pointsToWin} pkt`}
          </p>
        </div>

        {/* Americano controls */}
        {isAmericano && !hasFinalRound && (
          <div className="flex gap-2 flex-wrap">
            <form
              action={async () => {
                "use server";
                await generateNextAmericanoRound(id);
              }}
            >
              <button
                type="submit"
                disabled={!allCurrentCompleted}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
                title={
                  !allCurrentCompleted
                    ? "Najpierw wprowadź wyniki bieżącej rundy"
                    : undefined
                }
              >
                Następna runda →
              </button>
            </form>
            <form
              action={async () => {
                "use server";
                await generateAmericanoFinalRound(id);
              }}
            >
              <button
                type="submit"
                disabled={!allCurrentCompleted}
                className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-40 transition-colors"
                title={
                  !allCurrentCompleted
                    ? "Najpierw wprowadź wyniki bieżącej rundy"
                    : undefined
                }
              >
                Zakończ — Final Round
              </button>
            </form>
          </div>
        )}

        {isAmericano && hasFinalRound && finalRoundCompleted && (
          <div className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
            Turniej zakończony
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Ranking */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <span className="font-semibold text-gray-800">
              {isAmericano ? "Ranking indywidualny" : "Ranking turnieju"}
            </span>
          </div>

          {isAmericano ? (
            /* Americano: individual player ranking */
            individualRankings.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">
                Brak wyników.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left">#</th>
                    <th className="px-4 py-2 text-left">Gracz</th>
                    <th className="px-4 py-2 text-center">Pkt</th>
                    <th className="px-4 py-2 text-center">W/P</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {individualRankings.map((e, i) => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2 font-medium text-gray-800">
                        {e.team.player1.name}
                      </td>
                      <td className="px-4 py-2 text-center font-bold text-blue-600">
                        {e.points}
                      </td>
                      <td className="px-4 py-2 text-center text-gray-500">
                        {e.wins}/{e.losses}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            /* Standard: team ranking */
            tournament.rankingEntries.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400 text-center">
                Brak meczów.
              </p>
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
                      <td className="px-4 py-2 text-center font-bold text-blue-600">
                        {e.points}
                      </td>
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
            )
          )}
        </div>

        {/* Matches */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          {/* Sitting out notice (Americano) */}
          {isAmericano && sittingOut.length > 0 && !hasFinalRound && (
            <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-500">
              <span className="font-medium">Pauzują w rundzie {maxRound}:</span>{" "}
              {sittingOut.map((e) => e.team.player1.name).join(", ")}
            </div>
          )}

          {Object.entries(grouped).map(([label, matches]) => (
            <div key={label} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div
                className={`px-5 py-3 border-b border-gray-100 flex items-center justify-between ${
                  label === "Final" ? "bg-amber-50" : "bg-gray-50"
                }`}
              >
                <span
                  className={`font-semibold text-sm ${
                    label === "Final" ? "text-amber-700" : "text-gray-700"
                  }`}
                >
                  {label === "Final" ? "Final Round" : label}
                </span>
                {label === "Final" && (
                  <span className="text-xs text-amber-600 font-medium">
                    Pary: (1+4) vs (2+3) · (5+8) vs (6+7) · …
                  </span>
                )}
              </div>
              <ul className="divide-y divide-gray-100">
                {matches.map((m) => {
                  const t1Score = m.sets.reduce((a, s) => a + s.team1Score, 0);
                  const t2Score = m.sets.reduce((a, s) => a + s.team2Score, 0);
                  const t1SetsWon = m.sets.filter((s) => s.team1Score > s.team2Score).length;
                  const t2SetsWon = m.sets.filter((s) => s.team2Score > s.team1Score).length;

                  return (
                    <li key={m.id} className="px-4 py-3">
                      {m.status === "completed" ? (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 text-sm">
                            <span
                              className={
                                isAmericano
                                  ? t1Score > t2Score
                                    ? "font-bold text-green-700"
                                    : "text-gray-600"
                                  : t1SetsWon > t2SetsWon
                                  ? "font-bold text-green-700"
                                  : "text-gray-600"
                              }
                            >
                              {teamLabel(m.team1)}
                            </span>
                            <span className="mx-2 font-mono text-gray-500">
                              {isAmericano
                                ? `${t1Score} – ${t2Score}`
                                : m.sets.map((s) => `${s.team1Score}:${s.team2Score}`).join("  ")}
                            </span>
                            <span
                              className={
                                isAmericano
                                  ? t2Score > t1Score
                                    ? "font-bold text-green-700"
                                    : "text-gray-600"
                                  : t2SetsWon > t1SetsWon
                                  ? "font-bold text-green-700"
                                  : "text-gray-600"
                              }
                            >
                              {teamLabel(m.team2)}
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
                      ) : isAmericano ? (
                        /* Americano pending: validated point total entry */
                        <AmericanoScoreForm
                          matchId={m.id}
                          tournamentId={id}
                          team1Label={teamLabel(m.team1)}
                          team2Label={teamLabel(m.team2)}
                          pointsToWin={tournament.pointsToWin}
                        />
                      ) : (
                        /* Standard pending: up to 3 sets */
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
