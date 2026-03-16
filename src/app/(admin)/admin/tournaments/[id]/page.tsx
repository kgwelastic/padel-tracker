import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import {
  enterMatchResult,
  clearMatchResult,
  generateNextAmericanoRound,
  generateAmericanoFinalRound,
} from "./actions";
import { AmericanoScoreForm } from "./AmericanoScoreForm";
import { CourtMatchCard } from "./CourtMatchCard";
import { ImportCsvForm } from "./ImportCsvForm";

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
    if (match.group === "bye") continue; // bye matches are hidden, used only for ranking
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{tournament.name}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
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
          <div className="flex gap-2 flex-wrap items-center">
            <ImportCsvForm tournamentId={id} />
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
          <div className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium">
            Turniej zakończony
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Ranking */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <span className="font-semibold text-gray-800 dark:text-gray-100">
              {isAmericano ? "Ranking indywidualny" : "Ranking turnieju"}
            </span>
          </div>

          {isAmericano ? (
            /* Americano: individual player ranking */
            individualRankings.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400 dark:text-gray-500 text-center">
                Brak wyników.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-2 text-left">#</th>
                      <th className="px-4 py-2 text-left">Gracz</th>
                      <th className="px-4 py-2 text-center">Pkt</th>
                      <th className="px-4 py-2 text-center">W/P</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {individualRankings.map((e, i) => (
                      <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-2 text-gray-400 dark:text-gray-500">{i + 1}</td>
                        <td className="px-4 py-2 font-medium text-gray-800 dark:text-gray-100">
                          {e.team.player1.name}
                        </td>
                        <td className="px-4 py-2 text-center font-bold text-blue-600">
                          {e.points}
                        </td>
                        <td className="px-4 py-2 text-center text-gray-500 dark:text-gray-400">
                          {e.wins}/{e.losses}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* Standard: team ranking */
            tournament.rankingEntries.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-400 dark:text-gray-500 text-center">
                Brak meczów.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-2 text-left">#</th>
                      <th className="px-4 py-2 text-left">Drużyna</th>
                      <th className="px-4 py-2 text-center">Pkt</th>
                      <th className="px-4 py-2 text-center">W/P</th>
                      <th className="px-4 py-2 text-center">Gemy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {tournament.rankingEntries.map((e, i) => (
                      <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-2 text-gray-400 dark:text-gray-500">{i + 1}</td>
                        <td className="px-4 py-2 font-medium text-gray-800 dark:text-gray-100">
                          {teamLabel(e.team)}
                        </td>
                        <td className="px-4 py-2 text-center font-bold text-blue-600">
                          {e.points}
                        </td>
                        <td className="px-4 py-2 text-center text-gray-500 dark:text-gray-400">
                          {e.wins}/{e.losses}
                        </td>
                        <td className="px-4 py-2 text-center text-gray-500 dark:text-gray-400">
                          {e.gamesWon}/{e.gamesLost}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

        {/* Matches */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          {/* Sitting out notice (Americano) */}
          {isAmericano && sittingOut.length > 0 && !hasFinalRound && (
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400">
              <span className="font-medium">Pauzują w rundzie {maxRound}:</span>{" "}
              {sittingOut.map((e) => e.team.player1.name).join(", ")}
            </div>
          )}

          {Object.entries(grouped).map(([label, matches]) => (
            <div key={label}>
              {/* Round header */}
              <div
                className={`px-4 py-2.5 rounded-xl mb-3 flex items-center justify-between ${
                  label === "Final"
                    ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                    : "bg-gray-100 dark:bg-gray-700/50"
                }`}
              >
                <span
                  className={`font-semibold text-sm ${
                    label === "Final" ? "text-amber-700 dark:text-amber-400" : "text-gray-700 dark:text-gray-200"
                  }`}
                >
                  {label === "Final" ? "Final Round" : label}
                </span>
                {label === "Final" && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium hidden sm:block">
                    Pary: (1+4) vs (2+3) · (5+8) vs (6+7) · …
                  </span>
                )}
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {matches.filter((m) => m.status === "completed").length}/{matches.length} meczów
                </span>
              </div>

              {/* Court cards grid for Americano / standard list for others */}
              {isAmericano ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matches.map((m) => {
                    const t1Score = m.sets.reduce((a, s) => a + s.team1Score, 0);
                    const t2Score = m.sets.reduce((a, s) => a + s.team2Score, 0);
                    return (
                      <CourtMatchCard
                        key={m.id}
                        matchId={m.id}
                        tournamentId={id}
                        team1Player1={m.team1.player1.name}
                        team1Player2={m.team1.player2?.name ?? null}
                        team2Player1={m.team2.player1.name}
                        team2Player2={m.team2.player2?.name ?? null}
                        status={m.status as "pending" | "completed"}
                        t1Score={t1Score}
                        t2Score={t2Score}
                        pointsToWin={tournament.pointsToWin}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                  <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                    {matches.map((m) => {
                      const t1Score = m.sets.reduce((a, s) => a + s.team1Score, 0);
                      const t2Score = m.sets.reduce((a, s) => a + s.team2Score, 0);
                      const t1SetsWon = m.sets.filter((s) => s.team1Score > s.team2Score).length;
                      const t2SetsWon = m.sets.filter((s) => s.team2Score > s.team1Score).length;
                      return (
                        <li key={m.id} className="px-4 py-3">
                          {m.status === "completed" ? (
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 text-sm min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-0">
                                  <span className={`truncate ${t1SetsWon > t2SetsWon ? "font-bold text-green-700 dark:text-green-400" : "text-gray-600 dark:text-gray-300"}`}>
                                    {teamLabel(m.team1)}
                                  </span>
                                  <span className="font-mono text-gray-500 dark:text-gray-400 sm:mx-2 text-xs sm:text-sm">
                                    {m.sets.map((s) => `${s.team1Score}:${s.team2Score}`).join("  ")}
                                  </span>
                                  <span className={`truncate ${t2SetsWon > t1SetsWon ? "font-bold text-green-700 dark:text-green-400" : "text-gray-600 dark:text-gray-300"}`}>
                                    {teamLabel(m.team2)}
                                  </span>
                                </div>
                              </div>
                              <form action={async () => { "use server"; await clearMatchResult(m.id, id); }}>
                                <button type="submit" className="text-xs text-red-400 hover:text-red-600 flex-shrink-0" title="Usuń wynik">✕</button>
                              </form>
                            </div>
                          ) : (
                            <form action={enterMatchResult.bind(null, m.id, id)} className="flex flex-col gap-2">
                              <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                                <span>{teamLabel(m.team1)}</span>
                                <span className="text-gray-400 dark:text-gray-500">vs</span>
                                <span>{teamLabel(m.team2)}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {[1, 2, 3].map((n) => (
                                  <div key={n} className="flex items-center gap-1">
                                    <span className="text-xs text-gray-400 dark:text-gray-500 w-10">Set {n}</span>
                                    <input name={`set${n}_t1`} type="number" min="0" max="99" placeholder="—" className="w-12 border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    <span className="text-gray-400 dark:text-gray-500">:</span>
                                    <input name={`set${n}_t2`} type="number" min="0" max="99" placeholder="—" className="w-12 border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                  </div>
                                ))}
                                <button type="submit" className="bg-green-600 text-white text-xs px-3 py-1.5 rounded hover:bg-green-700 transition-colors">Zapisz</button>
                              </div>
                            </form>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          ))}

          {tournament.matches.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm px-5 py-8 text-gray-400 dark:text-gray-500 text-sm text-center">
              Brak meczów w tym turnieju.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
